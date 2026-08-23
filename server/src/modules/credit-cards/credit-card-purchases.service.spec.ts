import { CardPurchaseSource, CreditCardSource, Prisma } from "@prisma/client";
import {
  CreditCardPurchaseNotFoundException,
  CreditCardPurchaseReadOnlyException,
} from "../../common/exceptions/app.exception";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";
import { CreditCardPurchasesService } from "./credit-card-purchases.service";
import type { CreditCard } from "@prisma/client";

function createPrismaMock() {
  const prisma: any = {
    creditCardPurchase: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
    },
    creditCardInvoice: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    creditCard: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

function buildCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: "card-1",
    userId: "user-1",
    connectionId: null,
    externalCardId: null,
    institutionName: null,
    name: "Nubank",
    brand: "Mastercard",
    lastFourDigits: "4589",
    creditLimit: new Prisma.Decimal(1000) as any,
    availableLimit: new Prisma.Decimal(1000) as any,
    closingDay: 10,
    dueDay: 20,
    source: CreditCardSource.MANUAL,
    status: "ACTIVE" as any,
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPurchase(overrides: Record<string, unknown> = {}) {
  return {
    id: "purchase-1",
    userId: "user-1",
    cardId: "card-1",
    invoiceId: "inv-1",
    externalTransactionId: null,
    description: "Supermercado",
    merchantName: null,
    amount: new Prisma.Decimal(300),
    purchaseDate: new Date("2026-08-05T00:00:00.000Z"),
    categoryId: null,
    source: CardPurchaseSource.MANUAL,
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
    ...overrides,
  };
}

describe("CreditCardPurchasesService", () => {
  let prisma: any;
  let categoriesService: any;
  let invoicesService: CreditCardInvoicesService;
  let service: CreditCardPurchasesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    categoriesService = { assertOwnershipOrGlobal: jest.fn().mockResolvedValue({ id: "cat-1" }) };
    invoicesService = new CreditCardInvoicesService(prisma, {} as any);
    service = new CreditCardPurchasesService(prisma, categoriesService, invoicesService);

    prisma.creditCardInvoice.upsert.mockImplementation(({ create }: any) =>
      Promise.resolve({ id: `inv-${create.referenceMonth.toISOString().slice(0, 7)}`, ...create }),
    );
  });

  describe("create — single purchase", () => {
    it("resolves the invoice for the purchase date and recalculates totals/limit", async () => {
      prisma.creditCardPurchase.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildPurchase({ ...data })),
      );

      await service.create("user-1", buildCard(), {
        description: "Supermercado",
        amount: 300,
        purchaseDate: "2026-08-05",
      } as any);

      expect(prisma.creditCardPurchase.create).toHaveBeenCalledTimes(1);
      const data = prisma.creditCardPurchase.create.mock.calls[0][0].data;
      expect(data.invoiceId).toBe("inv-2026-08");
      expect(prisma.creditCardInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "inv-2026-08" } }),
      );
    });
  });

  describe("create — installments", () => {
    it("splits the amount exactly across installments, spreading them across monthly invoices", async () => {
      prisma.creditCardPurchase.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildPurchase({ ...data, id: `p-${data.installmentNumber}` })),
      );

      const result = await service.create("user-1", buildCard(), {
        description: "Notebook",
        amount: 1000,
        purchaseDate: "2026-08-05",
        totalInstallments: 3,
      } as any);

      expect(prisma.creditCardPurchase.create).toHaveBeenCalledTimes(3);

      const amounts = prisma.creditCardPurchase.create.mock.calls.map(
        (call: any) => call[0].data.amount,
      );
      expect(amounts.reduce((sum: number, value: number) => sum + value, 0)).toBeCloseTo(1000);

      const groupIds = new Set(
        prisma.creditCardPurchase.create.mock.calls.map(
          (call: any) => call[0].data.installmentGroupId,
        ),
      );
      expect(groupIds.size).toBe(1);

      const invoiceIds = prisma.creditCardPurchase.create.mock.calls.map(
        (call: any) => call[0].data.invoiceId,
      );
      expect(invoiceIds).toEqual(["inv-2026-08", "inv-2026-09", "inv-2026-10"]);
      expect(result.installmentNumber).toBe(1);
    });
  });

  describe("update — Open Finance purchases are read-only for description/date", () => {
    it("rejects changing description on an OPEN_FINANCE purchase", async () => {
      prisma.creditCardPurchase.findFirst.mockResolvedValue(
        buildPurchase({ source: CardPurchaseSource.OPEN_FINANCE }),
      );

      await expect(
        service.update("user-1", "purchase-1", { description: "Novo nome" } as any),
      ).rejects.toBeInstanceOf(CreditCardPurchaseReadOnlyException);
      expect(prisma.creditCardPurchase.update).not.toHaveBeenCalled();
    });

    it("still allows changing category/notes on an OPEN_FINANCE purchase", async () => {
      const existing = buildPurchase({ source: CardPurchaseSource.OPEN_FINANCE });
      prisma.creditCardPurchase.findFirst.mockResolvedValue(existing);
      prisma.creditCardPurchase.update.mockResolvedValue({ ...existing, categoryId: "cat-1" });

      await service.update("user-1", "purchase-1", { categoryId: "cat-1" } as any);

      expect(prisma.creditCardPurchase.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ categoryId: "cat-1" }) }),
      );
    });

    it("throws when the purchase does not belong to the user", async () => {
      prisma.creditCardPurchase.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "purchase-x", { notes: "x" } as any),
      ).rejects.toBeInstanceOf(CreditCardPurchaseNotFoundException);
    });
  });

  describe("remove — installment scope", () => {
    it("removes only the targeted installment when scope is 'one'", async () => {
      const purchase = buildPurchase({ installmentGroupId: "group-1", id: "p-2" });
      prisma.creditCardPurchase.findFirst.mockResolvedValue(purchase);

      await service.remove("user-1", "p-2", "one");

      expect(prisma.creditCardPurchase.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["p-2"] } },
      });
    });

    it("removes every installment in the group when scope is 'group'", async () => {
      const purchase = buildPurchase({ installmentGroupId: "group-1", id: "p-2" });
      prisma.creditCardPurchase.findFirst.mockResolvedValue(purchase);
      prisma.creditCardPurchase.findMany.mockResolvedValue([
        buildPurchase({ id: "p-1", installmentGroupId: "group-1", invoiceId: "inv-1" }),
        buildPurchase({ id: "p-2", installmentGroupId: "group-1", invoiceId: "inv-2" }),
        buildPurchase({ id: "p-3", installmentGroupId: "group-1", invoiceId: "inv-3" }),
      ]);

      await service.remove("user-1", "p-2", "group");

      expect(prisma.creditCardPurchase.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["p-1", "p-2", "p-3"] } },
      });
      expect(prisma.creditCardInvoice.update).toHaveBeenCalledTimes(3);
    });
  });
});
