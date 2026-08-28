import { CreditCardInvoiceStatus, Prisma } from "@prisma/client";
import {
  CreditCardInvoiceAlreadyPaidException,
  CreditCardInvoiceNotFoundException,
} from "../../common/exceptions/app.exception";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";

function createPrismaMock() {
  const prisma: any = {
    creditCardInvoice: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    creditCardPurchase: {
      findMany: jest.fn(),
    },
    account: {
      update: jest.fn(),
    },
    creditCard: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    expense: {
      create: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

function buildInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    userId: "user-1",
    cardId: "card-1",
    referenceMonth: new Date("2026-08-01T00:00:00.000Z"),
    closingDate: new Date("2026-08-10T00:00:00.000Z"),
    dueDate: new Date("2026-08-20T00:00:00.000Z"),
    totalAmount: new Prisma.Decimal(500),
    paidAmount: new Prisma.Decimal(0),
    status: CreditCardInvoiceStatus.OPEN,
    paidAt: null,
    paidFromAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("CreditCardInvoicesService", () => {
  let prisma: any;
  let accountsService: any;
  let service: CreditCardInvoicesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    accountsService = { assertOwnership: jest.fn().mockResolvedValue({ id: "acc-1" }) };
    service = new CreditCardInvoicesService(prisma, accountsService);
  });

  describe("resolveCycle", () => {
    const card = { closingDay: 10, dueDay: 20 };

    it("keeps a purchase on/before the closing day in the current month's cycle", () => {
      const cycle = service.resolveCycle(card, new Date("2026-08-09T00:00:00.000Z"));
      expect(cycle.referenceMonth.toISOString().slice(0, 10)).toBe("2026-08-01");
      expect(cycle.closingDate.toISOString().slice(0, 10)).toBe("2026-08-10");
      expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-08-20");
    });

    it("rolls a purchase after the closing day into next month's cycle", () => {
      const cycle = service.resolveCycle(card, new Date("2026-08-11T00:00:00.000Z"));
      expect(cycle.referenceMonth.toISOString().slice(0, 10)).toBe("2026-09-01");
      expect(cycle.closingDate.toISOString().slice(0, 10)).toBe("2026-09-10");
      expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-09-20");
    });

    it("treats a purchase exactly on the closing day as still current-cycle", () => {
      const cycle = service.resolveCycle(card, new Date("2026-08-10T00:00:00.000Z"));
      expect(cycle.referenceMonth.toISOString().slice(0, 10)).toBe("2026-08-01");
    });

    it("rolls the due date to next month when dueDay is on/before closingDay", () => {
      const cycle = service.resolveCycle(
        { closingDay: 28, dueDay: 5 },
        new Date("2026-08-01T00:00:00.000Z"),
      );
      expect(cycle.closingDate.toISOString().slice(0, 10)).toBe("2026-08-28");
      expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-09-05");
    });

    it("falls back to sane defaults when the card has no closing/due day configured yet", () => {
      const cycle = service.resolveCycle(
        { closingDay: null, dueDay: null },
        new Date("2026-08-15T00:00:00.000Z"),
      );
      expect(cycle.referenceMonth.toISOString().slice(0, 10)).toBe("2026-09-01");
    });
  });

  describe("pay", () => {
    it("decrements the source account and marks the invoice PAID", async () => {
      const invoice = buildInvoice();
      prisma.creditCardInvoice.findFirst.mockResolvedValueOnce(invoice);
      prisma.creditCardInvoice.update.mockResolvedValue({
        ...invoice,
        status: CreditCardInvoiceStatus.PAID,
        paidAmount: invoice.totalAmount,
        paidFromAccountId: "acc-1",
      });
      const card = { id: "card-1", name: "Nubank", source: "MANUAL", creditLimit: new Prisma.Decimal(1000) };
      prisma.creditCard.findUnique.mockResolvedValue(card);
      prisma.creditCard.findUniqueOrThrow.mockResolvedValue(card);
      prisma.category.findFirst.mockResolvedValue({ id: "cat-card" });
      prisma.expense.create.mockResolvedValue({ id: "exp-1" });
      prisma.creditCardPurchase.aggregate = jest.fn().mockResolvedValue({ _sum: { amount: null } });

      const result = await service.pay("user-1", "inv-1", { accountId: "acc-1" });

      expect(accountsService.assertOwnership).toHaveBeenCalledWith("user-1", "acc-1");
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { decrement: invoice.totalAmount } },
      });
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAID", amount: invoice.totalAmount }),
        }),
      );
      expect(prisma.creditCardInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-1" },
          data: expect.objectContaining({ status: CreditCardInvoiceStatus.PAID }),
        }),
      );
      expect(result.status).toBe(CreditCardInvoiceStatus.PAID);
    });

    it("rejects paying an invoice that is already PAID", async () => {
      prisma.creditCardInvoice.findFirst.mockResolvedValueOnce(
        buildInvoice({ status: CreditCardInvoiceStatus.PAID }),
      );

      await expect(service.pay("user-1", "inv-1", { accountId: "acc-1" })).rejects.toBeInstanceOf(
        CreditCardInvoiceAlreadyPaidException,
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it("throws when the invoice does not belong to the user", async () => {
      prisma.creditCardInvoice.findFirst.mockResolvedValueOnce(null);

      await expect(service.pay("user-1", "inv-x", { accountId: "acc-1" })).rejects.toBeInstanceOf(
        CreditCardInvoiceNotFoundException,
      );
    });
  });

  describe("list — dynamic status", () => {
    it("derives OVERDUE for an unpaid invoice past its due date, without writing to the database", async () => {
      const past = buildInvoice({
        closingDate: new Date("2020-01-10T00:00:00.000Z"),
        dueDate: new Date("2020-01-20T00:00:00.000Z"),
      });
      prisma.creditCardInvoice.findMany.mockResolvedValue([past]);

      const [result] = await service.list("user-1", "card-1");

      expect(result.status).toBe(CreditCardInvoiceStatus.OVERDUE);
      expect(prisma.creditCardInvoice.update).not.toHaveBeenCalled();
    });

    it("never overrides a persisted PAID status", async () => {
      const paid = buildInvoice({
        status: CreditCardInvoiceStatus.PAID,
        closingDate: new Date("2020-01-10T00:00:00.000Z"),
        dueDate: new Date("2020-01-20T00:00:00.000Z"),
      });
      prisma.creditCardInvoice.findMany.mockResolvedValue([paid]);

      const [result] = await service.list("user-1", "card-1");

      expect(result.status).toBe(CreditCardInvoiceStatus.PAID);
    });
  });
});
