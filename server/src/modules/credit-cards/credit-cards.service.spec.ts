import { CreditCardSource, CreditCardStatus, Prisma } from "@prisma/client";
import {
  CreditCardArchivedException,
  CreditCardNotFoundException,
  CreditCardReadOnlyException,
} from "../../common/exceptions/app.exception";
import { CreditCardsService } from "./credit-cards.service";

function createPrismaMock() {
  const prisma: any = {
    creditCard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    creditCardInvoice: {
      count: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: null } }),
    },
    creditCardPurchase: {
      count: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

function buildCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    userId: "user-1",
    connectionId: null,
    externalCardId: null,
    institutionName: null,
    name: "Nubank",
    brand: "Mastercard",
    lastFourDigits: "4589",
    creditLimit: new Prisma.Decimal(1000),
    availableLimit: new Prisma.Decimal(1000),
    closingDay: 10,
    dueDay: 20,
    source: CreditCardSource.MANUAL,
    status: CreditCardStatus.ACTIVE,
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("CreditCardsService", () => {
  let prisma: any;
  let service: CreditCardsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CreditCardsService(prisma);
  });

  describe("create", () => {
    it("creates a MANUAL card with availableLimit seeded from creditLimit", async () => {
      prisma.creditCard.create.mockResolvedValue(buildCard());

      const result = await service.create("user-1", {
        name: "Nubank",
        creditLimit: 1000,
      } as any);

      expect(prisma.creditCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: CreditCardSource.MANUAL,
            creditLimit: 1000,
            availableLimit: 1000,
          }),
        }),
      );
      expect(result.creditLimit).toBe(1000);
    });
  });

  describe("update", () => {
    it("rejects editing an OPEN_FINANCE card's data fields", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(
        buildCard({ source: CreditCardSource.OPEN_FINANCE }),
      );

      await expect(
        service.update("user-1", "card-1", { name: "Novo nome" } as any),
      ).rejects.toBeInstanceOf(CreditCardReadOnlyException);
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it("throws when the card does not belong to the user", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "card-x", { name: "Novo nome" } as any),
      ).rejects.toBeInstanceOf(CreditCardNotFoundException);
    });
  });

  describe("archiveOrDelete", () => {
    it("hard-deletes a card with no invoices or purchases", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(buildCard());
      prisma.creditCardInvoice.count.mockResolvedValue(0);
      prisma.creditCardPurchase.count.mockResolvedValue(0);

      const result = await service.archiveOrDelete("user-1", "card-1");

      expect(result.archived).toBe(false);
      expect(prisma.creditCard.delete).toHaveBeenCalledWith({ where: { id: "card-1" } });
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it("archives a card that has invoice/purchase history instead of deleting it", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(buildCard());
      prisma.creditCardInvoice.count.mockResolvedValue(2);
      prisma.creditCardPurchase.count.mockResolvedValue(5);

      const result = await service.archiveOrDelete("user-1", "card-1");

      expect(result.archived).toBe(true);
      expect(prisma.creditCard.delete).not.toHaveBeenCalled();
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: { status: CreditCardStatus.ARCHIVED },
      });
    });
  });

  describe("assertOwnedActiveCard", () => {
    it("rejects new purchases on an archived card", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(
        buildCard({ status: CreditCardStatus.ARCHIVED }),
      );

      await expect(service.assertOwnedActiveCard("user-1", "card-1")).rejects.toBeInstanceOf(
        CreditCardArchivedException,
      );
    });
  });

  describe("getSummary", () => {
    it("aggregates limit and open-invoice totals across the user's active cards", async () => {
      prisma.creditCard.findMany.mockResolvedValue([
        buildCard({
          creditLimit: new Prisma.Decimal(1000),
          availableLimit: new Prisma.Decimal(700),
        }),
        buildCard({
          id: "card-2",
          creditLimit: new Prisma.Decimal(500),
          availableLimit: new Prisma.Decimal(500),
        }),
      ]);
      prisma.creditCardInvoice.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Prisma.Decimal(350) },
      });

      const summary = await service.getSummary("user-1");

      expect(summary).toEqual({
        cardCount: 2,
        totalLimit: 1500,
        totalAvailable: 1200,
        totalUsed: 300,
        openInvoicesTotal: 350,
      });
    });
  });
});
