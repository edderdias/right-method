import { CreditCardSource, CreditCardStatus, Prisma } from "@prisma/client";
import {
  CreditCardArchivedException,
  CreditCardHasFuturePurchaseException,
  CreditCardHasOpenInvoiceException,
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
      findMany: jest.fn().mockResolvedValue([]),
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
    /** The service issues two `count()` calls each for invoices/purchases: one filtered (open
     * invoices / future purchases, used by the new deletion guard) and one unfiltered (used to
     * decide archive vs. hard-delete). Distinguishes them by whether `where` carries the filter. */
    function mockCounts(prisma: any, counts: {
      openInvoices?: number;
      futurePurchases?: number;
      totalInvoices?: number;
      totalPurchases?: number;
    }) {
      prisma.creditCardInvoice.count.mockImplementation((args: any) =>
        Promise.resolve(args?.where?.status ? (counts.openInvoices ?? 0) : (counts.totalInvoices ?? 0)),
      );
      prisma.creditCardPurchase.count.mockImplementation((args: any) =>
        Promise.resolve(
          args?.where?.purchaseDate ? (counts.futurePurchases ?? 0) : (counts.totalPurchases ?? 0),
        ),
      );
    }

    it("hard-deletes a card with no invoices or purchases", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(buildCard());
      mockCounts(prisma, {});

      const result = await service.archiveOrDelete("user-1", "card-1");

      expect(result.archived).toBe(false);
      expect(prisma.creditCard.delete).toHaveBeenCalledWith({ where: { id: "card-1" } });
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it("archives a card that has invoice/purchase history instead of deleting it", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(buildCard());
      mockCounts(prisma, { totalInvoices: 2, totalPurchases: 5 });

      const result = await service.archiveOrDelete("user-1", "card-1");

      expect(result.archived).toBe(true);
      expect(prisma.creditCard.delete).not.toHaveBeenCalled();
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: { status: CreditCardStatus.ARCHIVED },
      });
    });

    it("rejects deleting a card that has an open (unpaid) invoice", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(buildCard());
      mockCounts(prisma, { openInvoices: 1, totalInvoices: 1 });

      await expect(service.archiveOrDelete("user-1", "card-1")).rejects.toBeInstanceOf(
        CreditCardHasOpenInvoiceException,
      );
      expect(prisma.creditCard.delete).not.toHaveBeenCalled();
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it("rejects deleting a card that has a purchase dated in the future", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(buildCard());
      mockCounts(prisma, { futurePurchases: 1, totalPurchases: 1 });

      await expect(service.archiveOrDelete("user-1", "card-1")).rejects.toBeInstanceOf(
        CreditCardHasFuturePurchaseException,
      );
      expect(prisma.creditCard.delete).not.toHaveBeenCalled();
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
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
      prisma.creditCardInvoice.aggregate.mockImplementation((args: any) =>
        Promise.resolve({
          _sum: {
            totalAmount: args?.where?.referenceMonth
              ? new Prisma.Decimal(120)
              : new Prisma.Decimal(350),
          },
        }),
      );

      const summary = await service.getSummary("user-1");

      expect(summary).toEqual({
        cardCount: 2,
        totalLimit: 1500,
        totalAvailable: 1200,
        totalUsed: 300,
        openInvoicesTotal: 350,
        currentMonthInvoicesTotal: 120,
      });
    });

    it("counts the current month's invoice even if it's already been paid, unlike openInvoicesTotal", async () => {
      prisma.creditCard.findMany.mockResolvedValue([buildCard()]);
      // Simulates the real bug: this month's invoice (130) is PAID, so it must be excluded from
      // openInvoicesTotal (which only counts unpaid invoices) but still counted in
      // currentMonthInvoicesTotal (which reports the month's bill regardless of payment status).
      prisma.creditCardInvoice.aggregate.mockImplementation((args: any) =>
        Promise.resolve({
          _sum: {
            totalAmount: args?.where?.referenceMonth
              ? new Prisma.Decimal(130)
              : new Prisma.Decimal(0),
          },
        }),
      );

      const summary = await service.getSummary("user-1");

      expect(summary.currentMonthInvoicesTotal).toBe(130);
      expect(summary.openInvoicesTotal).toBe(0);

      const currentMonthCall = prisma.creditCardInvoice.aggregate.mock.calls.find(
        (call: any) => call[0].where.referenceMonth,
      );
      expect(currentMonthCall[0].where.status).toBeUndefined();
    });
  });

  describe("getCardsCurrentInvoices", () => {
    it("returns each active card's current-cycle invoice total", async () => {
      prisma.creditCardInvoice.findMany.mockResolvedValue([
        { cardId: "card-1", totalAmount: new Prisma.Decimal(450) },
        { cardId: "card-2", totalAmount: new Prisma.Decimal(0) },
      ]);

      const result = await service.getCardsCurrentInvoices("user-1");

      expect(result).toEqual([
        { cardId: "card-1", currentInvoiceTotal: 450 },
        { cardId: "card-2", currentInvoiceTotal: 0 },
      ]);
      const where = prisma.creditCardInvoice.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({
        userId: "user-1",
        card: { status: CreditCardStatus.ACTIVE },
      });
      expect(where.referenceMonth).toBeInstanceOf(Date);
    });

    it("omits cards with no invoice for the current month", async () => {
      prisma.creditCardInvoice.findMany.mockResolvedValue([]);

      const result = await service.getCardsCurrentInvoices("user-1");

      expect(result).toEqual([]);
    });
  });
});
