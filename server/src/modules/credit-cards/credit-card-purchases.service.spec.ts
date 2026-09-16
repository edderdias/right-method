import { CardPurchaseSource, CardPurchaseType, CreditCardSource, Prisma } from "@prisma/client";
import {
  CreditCardPurchaseNotFoundException,
  CreditCardPurchaseReadOnlyException,
  InvalidCreditCardPurchaseConfigException,
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
      groupBy: jest.fn().mockResolvedValue([]),
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
    type: CardPurchaseType.PURCHASE,
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    notes: null,
    isRecurring: false,
    recurrenceEndDate: null,
    parentPurchaseId: null,
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

  describe("create — responsible name", () => {
    it("persists a trimmed responsibleName and blanks become null", async () => {
      prisma.creditCardPurchase.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildPurchase({ ...data })),
      );

      await service.create("user-1", buildCard(), {
        description: "Mercado",
        amount: 100,
        purchaseDate: "2026-08-05",
        responsibleName: "  João  ",
      } as any);
      expect(prisma.creditCardPurchase.create.mock.calls[0][0].data.responsibleName).toBe("João");

      prisma.creditCardPurchase.create.mockClear();
      await service.create("user-1", buildCard(), {
        description: "Mercado",
        amount: 100,
        purchaseDate: "2026-08-05",
        responsibleName: "   ",
      } as any);
      expect(prisma.creditCardPurchase.create.mock.calls[0][0].data.responsibleName).toBeNull();
    });

    it("repeats the same responsibleName across every installment", async () => {
      prisma.creditCardPurchase.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildPurchase({ ...data, id: `p-${data.installmentNumber}` })),
      );

      await service.create("user-1", buildCard(), {
        description: "Notebook",
        amount: 900,
        purchaseDate: "2026-08-05",
        totalInstallments: 3,
        responsibleName: "Maria",
      } as any);

      const names = prisma.creditCardPurchase.create.mock.calls.map(
        (call: any) => call[0].data.responsibleName,
      );
      expect(names).toEqual(["Maria", "Maria", "Maria"]);
    });
  });

  describe("list — responsibleName filter", () => {
    it("filters by the exact responsible name when provided", async () => {
      prisma.creditCardPurchase.findMany.mockResolvedValue([]);
      prisma.creditCardPurchase.count.mockResolvedValue(0);

      await service.list("user-1", "card-1", { responsibleName: "João" } as any);

      expect(prisma.creditCardPurchase.findMany.mock.calls[0][0].where.responsibleName).toBe(
        "João",
      );
    });
  });

  describe("responsiblesSummary", () => {
    it("maps groupBy rows to totals and sorts by total descending", async () => {
      prisma.creditCardPurchase.groupBy.mockResolvedValue([
        { responsibleName: "João", _sum: { amount: new Prisma.Decimal(120) }, _count: { _all: 2 } },
        { responsibleName: null, _sum: { amount: new Prisma.Decimal(300) }, _count: { _all: 1 } },
      ]);

      const result = await service.responsiblesSummary("user-1", "card-1", {
        from: "2026-08-01",
        to: "2026-08-31",
      });

      expect(result).toEqual([
        { responsibleName: null, total: 300, count: 1 },
        { responsibleName: "João", total: 120, count: 2 },
      ]);
      const where = prisma.creditCardPurchase.groupBy.mock.calls[0][0].where;
      expect(where).toMatchObject({ userId: "user-1", cardId: "card-1" });
      expect(where.purchaseDate).toBeDefined();
    });

    it("nets a responsible's credits (estornos) against their purchases", async () => {
      prisma.creditCardPurchase.groupBy.mockResolvedValue([
        {
          responsibleName: "João",
          type: CardPurchaseType.PURCHASE,
          _sum: { amount: new Prisma.Decimal(500) },
          _count: { _all: 2 },
        },
        {
          responsibleName: "João",
          type: CardPurchaseType.CREDIT,
          _sum: { amount: new Prisma.Decimal(120) },
          _count: { _all: 1 },
        },
      ]);

      const result = await service.responsiblesSummary("user-1", "card-1", {});

      expect(result).toEqual([{ responsibleName: "João", total: 380, count: 3 }]);
    });
  });

  describe("responsiblesSummaryAllCards", () => {
    it("scopes the groupBy to the user's active cards, without a cardId filter", async () => {
      prisma.creditCardPurchase.groupBy.mockResolvedValue([
        {
          responsibleName: "Maria",
          type: CardPurchaseType.PURCHASE,
          _sum: { amount: new Prisma.Decimal(700) },
          _count: { _all: 3 },
        },
      ]);

      const result = await service.responsiblesSummaryAllCards("user-1");

      expect(result).toEqual([{ responsibleName: "Maria", total: 700, count: 3 }]);
      const where = prisma.creditCardPurchase.groupBy.mock.calls[0][0].where;
      expect(where).toEqual({ userId: "user-1", card: { status: "ACTIVE" } });
    });

    it("nets credits against purchases across all cards combined", async () => {
      prisma.creditCardPurchase.groupBy.mockResolvedValue([
        {
          responsibleName: "Maria",
          type: CardPurchaseType.PURCHASE,
          _sum: { amount: new Prisma.Decimal(500) },
          _count: { _all: 2 },
        },
        {
          responsibleName: "Maria",
          type: CardPurchaseType.CREDIT,
          _sum: { amount: new Prisma.Decimal(200) },
          _count: { _all: 1 },
        },
      ]);

      const result = await service.responsiblesSummaryAllCards("user-1");

      expect(result).toEqual([{ responsibleName: "Maria", total: 300, count: 3 }]);
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

  describe("create — credit (estorno)", () => {
    it("tags a single credit entry with type CREDIT", async () => {
      prisma.creditCardPurchase.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildPurchase({ ...data })),
      );

      const result = await service.create("user-1", buildCard(), {
        description: "Estorno - Blusa devolvida",
        amount: 150,
        purchaseDate: "2026-08-05",
        type: CardPurchaseType.CREDIT,
      } as any);

      expect(prisma.creditCardPurchase.create.mock.calls[0][0].data.type).toBe(
        CardPurchaseType.CREDIT,
      );
      expect(result.type).toBe(CardPurchaseType.CREDIT);
    });

    it("splits a credit across installments, tagging every installment as CREDIT", async () => {
      prisma.creditCardPurchase.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildPurchase({ ...data, id: `p-${data.installmentNumber}` })),
      );

      await service.create("user-1", buildCard(), {
        description: "Estorno - Notebook devolvido",
        amount: 900,
        purchaseDate: "2026-08-05",
        totalInstallments: 3,
        type: CardPurchaseType.CREDIT,
      } as any);

      const types = prisma.creditCardPurchase.create.mock.calls.map(
        (call: any) => call[0].data.type,
      );
      expect(types).toEqual([CardPurchaseType.CREDIT, CardPurchaseType.CREDIT, CardPurchaseType.CREDIT]);
    });

    it("rejects a credit that is also recurring", async () => {
      await expect(
        service.create("user-1", buildCard(), {
          description: "Estorno",
          amount: 100,
          purchaseDate: "2026-08-05",
          type: CardPurchaseType.CREDIT,
          isRecurring: true,
        } as any),
      ).rejects.toBeInstanceOf(InvalidCreditCardPurchaseConfigException);
      expect(prisma.creditCardPurchase.create).not.toHaveBeenCalled();
    });

    it("rejects turning an existing credit entry recurring on update", async () => {
      prisma.creditCardPurchase.findFirst.mockResolvedValue(
        buildPurchase({ type: CardPurchaseType.CREDIT }),
      );

      await expect(
        service.update("user-1", "purchase-1", { isRecurring: true } as any),
      ).rejects.toBeInstanceOf(InvalidCreditCardPurchaseConfigException);
      expect(prisma.creditCardPurchase.update).not.toHaveBeenCalled();
    });
  });

  describe("create — recurring purchases", () => {
    it("persists isRecurring and recurrenceEndDate", async () => {
      prisma.creditCardPurchase.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildPurchase({ ...data })),
      );

      await service.create("user-1", buildCard(), {
        description: "Netflix",
        amount: 55,
        purchaseDate: "2026-08-05",
        isRecurring: true,
        recurrenceEndDate: "2027-08-05",
      } as any);

      const data = prisma.creditCardPurchase.create.mock.calls[0][0].data;
      expect(data.isRecurring).toBe(true);
      expect(data.recurrenceEndDate).toEqual(new Date("2027-08-05T00:00:00.000Z"));
    });

    it("rejects a purchase that is both recurring and installment", async () => {
      await expect(
        service.create("user-1", buildCard(), {
          description: "Notebook",
          amount: 900,
          purchaseDate: "2026-08-05",
          isRecurring: true,
          totalInstallments: 3,
        } as any),
      ).rejects.toBeInstanceOf(InvalidCreditCardPurchaseConfigException);
      expect(prisma.creditCardPurchase.create).not.toHaveBeenCalled();
    });

    it("rejects a recurrenceEndDate on/before the purchase date", async () => {
      await expect(
        service.create("user-1", buildCard(), {
          description: "Netflix",
          amount: 55,
          purchaseDate: "2026-08-05",
          isRecurring: true,
          recurrenceEndDate: "2026-08-05",
        } as any),
      ).rejects.toBeInstanceOf(InvalidCreditCardPurchaseConfigException);
      expect(prisma.creditCardPurchase.create).not.toHaveBeenCalled();
    });
  });

  describe("update — recurring purchases", () => {
    it("stops the recurrence by setting isRecurring to false", async () => {
      const existing = buildPurchase({ isRecurring: true });
      prisma.creditCardPurchase.findFirst.mockResolvedValue(existing);
      prisma.creditCardPurchase.update.mockResolvedValue({ ...existing, isRecurring: false });

      await service.update("user-1", "purchase-1", { isRecurring: false } as any);

      expect(prisma.creditCardPurchase.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRecurring: false }) }),
      );
    });

    it("rejects turning an OPEN_FINANCE purchase recurring", async () => {
      prisma.creditCardPurchase.findFirst.mockResolvedValue(
        buildPurchase({ source: CardPurchaseSource.OPEN_FINANCE }),
      );

      await expect(
        service.update("user-1", "purchase-1", { isRecurring: true } as any),
      ).rejects.toBeInstanceOf(CreditCardPurchaseReadOnlyException);
      expect(prisma.creditCardPurchase.update).not.toHaveBeenCalled();
    });

    it("rejects turning an installment purchase recurring", async () => {
      prisma.creditCardPurchase.findFirst.mockResolvedValue(
        buildPurchase({ installmentGroupId: "group-1" }),
      );

      await expect(
        service.update("user-1", "purchase-1", { isRecurring: true } as any),
      ).rejects.toBeInstanceOf(InvalidCreditCardPurchaseConfigException);
      expect(prisma.creditCardPurchase.update).not.toHaveBeenCalled();
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
