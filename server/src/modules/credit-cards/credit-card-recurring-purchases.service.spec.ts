import { CardPurchaseSource, CreditCardSource, CreditCardStatus, Prisma } from "@prisma/client";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";
import { CreditCardRecurringPurchasesService } from "./credit-card-recurring-purchases.service";

function createPrismaMock() {
  const prisma: any = {
    creditCardPurchase: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
    },
    creditCardInvoice: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    creditCard: {
      findUnique: jest.fn(),
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
    creditLimit: new Prisma.Decimal(1000) as any,
    availableLimit: new Prisma.Decimal(1000) as any,
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

function buildTip(overrides: Record<string, unknown> = {}) {
  return {
    id: "purchase-1",
    userId: "user-1",
    cardId: "card-1",
    invoiceId: "inv-1",
    externalTransactionId: null,
    description: "Netflix",
    merchantName: null,
    amount: new Prisma.Decimal(55),
    purchaseDate: new Date("2026-08-05T00:00:00.000Z"),
    categoryId: "cat-1",
    responsibleName: null,
    source: CardPurchaseSource.MANUAL,
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    notes: null,
    isRecurring: true,
    recurrenceEndDate: null,
    parentPurchaseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    card: buildCard(),
    ...overrides,
  };
}

describe("CreditCardRecurringPurchasesService", () => {
  let prisma: any;
  let invoicesService: CreditCardInvoicesService;
  let service: CreditCardRecurringPurchasesService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-05T12:00:00.000Z"));

    prisma = createPrismaMock();
    invoicesService = new CreditCardInvoicesService(prisma, {} as any);
    service = new CreditCardRecurringPurchasesService(prisma, invoicesService);

    prisma.creditCardInvoice.upsert.mockImplementation(({ create }: any) =>
      Promise.resolve({ id: `inv-${create.referenceMonth.toISOString().slice(0, 7)}`, ...create }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("only scans active-card series whose most recent occurrence has no child yet", async () => {
    await service.generateDueOccurrences();

    expect(prisma.creditCardPurchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isRecurring: true,
          childPurchases: { none: {} },
          card: { status: CreditCardStatus.ACTIVE },
        },
      }),
    );
  });

  it("clones the next occurrence once its monthly anniversary date has arrived", async () => {
    prisma.creditCardPurchase.findMany.mockResolvedValue([buildTip()]); // due 2026-09-05, today is 2026-09-05

    await service.generateDueOccurrences();

    expect(prisma.creditCardPurchase.create).toHaveBeenCalledTimes(1);
    const data = prisma.creditCardPurchase.create.mock.calls[0][0].data;
    expect(data.purchaseDate).toEqual(new Date("2026-09-05T00:00:00.000Z"));
    expect(data.parentPurchaseId).toBe("purchase-1");
    expect(data.isRecurring).toBe(true);
    expect(data.description).toBe("Netflix");
    expect(data.invoiceId).toBe("inv-2026-09");
  });

  it("rolls a clone that lands after the closing day into the next month's invoice", async () => {
    // purchaseDate 2026-08-15 -> next anniversary 2026-09-15, which is after closingDay 10.
    prisma.creditCardPurchase.findMany.mockResolvedValue([
      buildTip({ purchaseDate: new Date("2026-08-15T00:00:00.000Z") }),
    ]);
    jest.setSystemTime(new Date("2026-09-16T12:00:00.000Z"));

    await service.generateDueOccurrences();

    const data = prisma.creditCardPurchase.create.mock.calls[0][0].data;
    expect(data.invoiceId).toBe("inv-2026-10");
  });

  it("does not clone before the next anniversary date is due", async () => {
    prisma.creditCardPurchase.findMany.mockResolvedValue([buildTip()]);
    jest.setSystemTime(new Date("2026-09-01T12:00:00.000Z")); // before 2026-09-05

    await service.generateDueOccurrences();

    expect(prisma.creditCardPurchase.create).not.toHaveBeenCalled();
  });

  it("turns the series off once the next occurrence would be past the user-informed end date", async () => {
    prisma.creditCardPurchase.findMany.mockResolvedValue([
      buildTip({ recurrenceEndDate: new Date("2026-08-20T00:00:00.000Z") }),
    ]);

    await service.generateDueOccurrences();

    expect(prisma.creditCardPurchase.create).not.toHaveBeenCalled();
    expect(prisma.creditCardPurchase.update).toHaveBeenCalledWith({
      where: { id: "purchase-1" },
      data: { isRecurring: false },
    });
  });

  it("keeps scanning remaining series when one of them fails", async () => {
    prisma.creditCardPurchase.findMany.mockResolvedValue([
      buildTip({ id: "purchase-1", cardId: "card-1" }),
      buildTip({ id: "purchase-2", cardId: "card-1" }),
    ]);
    prisma.creditCardPurchase.create.mockRejectedValueOnce(new Error("boom"));

    await expect(service.generateDueOccurrences()).resolves.toBeUndefined();

    expect(prisma.creditCardPurchase.create).toHaveBeenCalledTimes(2);
  });
});
