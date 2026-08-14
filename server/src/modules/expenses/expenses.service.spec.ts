import { Prisma, RecurrenceType, ExpenseStatus } from "@prisma/client";
import {
  ExpenseNotFoundException,
  FinanceAccountNotFoundException,
  InvalidExpenseConfigException,
} from "../../common/exceptions/app.exception";
import { ExpensesService } from "./expenses.service";
import type { CreateExpenseDto } from "./dto/create-expense.dto";

function buildExpense(overrides: Record<string, unknown> = {}) {
  return {
    id: "exp-1",
    userId: "user-1",
    description: "Aluguel",
    amount: new Prisma.Decimal(1000),
    categoryId: "cat-1",
    accountId: "acc-1",
    dueDate: new Date("2099-01-01T00:00:00.000Z"),
    paidAt: null,
    status: ExpenseStatus.PENDING,
    notes: null,
    isRecurring: false,
    recurrenceType: null,
    recurrenceEndDate: null,
    parentExpenseId: null,
    isInstallment: false,
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    creditCardId: null,
    attachmentUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: {
      id: "cat-1",
      name: "Moradia",
      type: "EXPENSE",
      userId: null,
      createdAt: new Date(),
    },
    account: {
      id: "acc-1",
      userId: "user-1",
      name: "Conta corrente",
      balance: new Prisma.Decimal(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

function buildCreateDto(overrides: Partial<CreateExpenseDto> = {}): CreateExpenseDto {
  return {
    description: "Aluguel",
    amount: 1000,
    categoryId: "cat-1",
    accountId: "acc-1",
    dueDate: "2026-08-15",
    ...overrides,
  } as CreateExpenseDto;
}

function createPrismaMock() {
  const prisma: any = {
    expense: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      update: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

describe("ExpensesService", () => {
  let prisma: any;
  let accountsService: any;
  let categoriesService: any;
  let service: ExpensesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    accountsService = { assertOwnership: jest.fn().mockResolvedValue({ id: "acc-1" }) };
    categoriesService = { assertOwnershipOrGlobal: jest.fn().mockResolvedValue({ id: "cat-1" }) };
    service = new ExpensesService(prisma, accountsService, categoriesService);
  });

  describe("create", () => {
    it("creates a PENDING expense without touching the account balance", async () => {
      prisma.expense.create.mockResolvedValue(buildExpense({ status: ExpenseStatus.PENDING }));

      const result = await service.create("user-1", buildCreateDto());

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ExpenseStatus.PENDING }),
        }),
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(result.status).toBe(ExpenseStatus.PENDING);
    });

    it("creates a PAID expense and decrements the destination account balance", async () => {
      prisma.expense.create.mockResolvedValue(buildExpense({ status: ExpenseStatus.PAID }));

      await service.create("user-1", buildCreateDto({ status: "PAID" }));

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { decrement: 1000 } },
      });
    });

    it("rejects when the destination account does not belong to the user", async () => {
      accountsService.assertOwnership.mockRejectedValue(new FinanceAccountNotFoundException());

      await expect(service.create("user-1", buildCreateDto())).rejects.toBeInstanceOf(
        FinanceAccountNotFoundException,
      );
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it("rejects a config that is both recurring and installment", async () => {
      await expect(
        service.create(
          "user-1",
          buildCreateDto({ isRecurring: true, isInstallment: true, totalInstallments: 3 }),
        ),
      ).rejects.toBeInstanceOf(InvalidExpenseConfigException);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it("rejects installment without totalInstallments", async () => {
      await expect(
        service.create("user-1", buildCreateDto({ isInstallment: true })),
      ).rejects.toBeInstanceOf(InvalidExpenseConfigException);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });
  });

  describe("create — installments", () => {
    it("creates all installments as PENDING with an exact amount split and never touches the balance", async () => {
      prisma.expense.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildExpense({ ...data, id: `exp-${data.installmentNumber}` })),
      );

      const result = await service.create(
        "user-1",
        buildCreateDto({ amount: 1000, isInstallment: true, totalInstallments: 3 }),
      );

      expect(prisma.expense.create).toHaveBeenCalledTimes(3);
      expect(prisma.account.update).not.toHaveBeenCalled();

      const amounts = prisma.expense.create.mock.calls.map((call: any) => call[0].data.amount);
      const total = amounts.reduce((sum: number, value: number) => sum + value, 0);
      expect(total).toBeCloseTo(1000);
      expect(amounts.every((value: number) => value > 0)).toBe(true);

      const groupIds = new Set(
        prisma.expense.create.mock.calls.map((call: any) => call[0].data.installmentGroupId),
      );
      expect(groupIds.size).toBe(1);

      expect(prisma.expense.create.mock.calls[0][0].data.installmentNumber).toBe(1);
      expect(prisma.expense.create.mock.calls[1][0].data.installmentNumber).toBe(2);
      expect(prisma.expense.create.mock.calls[2][0].data.installmentNumber).toBe(3);
      expect(prisma.expense.create.mock.calls[0][0].data.installmentTotal).toBe(3);
      expect(prisma.expense.create.mock.calls[0][0].data.status).toBe(ExpenseStatus.PENDING);

      const dueDates = prisma.expense.create.mock.calls.map((call: any) =>
        (call[0].data.dueDate as Date).toISOString().slice(0, 10),
      );
      expect(dueDates).toEqual(["2026-08-15", "2026-09-15", "2026-10-15"]);

      expect(result.installmentNumber).toBe(1);
    });
  });

  describe("update — ownership", () => {
    it("throws ExpenseNotFoundException for an expense that does not belong to the user", async () => {
      prisma.expense.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "exp-x", { description: "Novo" }),
      ).rejects.toBeInstanceOf(ExpenseNotFoundException);
      expect(prisma.expense.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "exp-x", userId: "user-1" }),
        }),
      );
    });
  });

  describe("update — balance impact", () => {
    it("decrements the account balance when a PENDING expense becomes PAID", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PENDING,
        amount: new Prisma.Decimal(1000),
      });
      prisma.expense.findFirst.mockResolvedValueOnce(existing);
      prisma.expense.update.mockResolvedValue({ ...existing, status: ExpenseStatus.PAID });

      const result = await service.update("user-1", "exp-1", { status: "PAID" });

      expect(prisma.account.update).toHaveBeenCalledTimes(1);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { decrement: 1000 } },
      });
      expect(result.status).toBe(ExpenseStatus.PAID);
    });

    it("increments the account balance and clears paidAt when PAID becomes PENDING", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PAID,
        amount: new Prisma.Decimal(800),
      });
      prisma.expense.findFirst.mockResolvedValueOnce(existing);
      prisma.expense.update.mockResolvedValue({
        ...existing,
        status: ExpenseStatus.PENDING,
        paidAt: null,
      });

      await service.update("user-1", "exp-1", { status: "PENDING" });

      expect(prisma.account.update).toHaveBeenCalledTimes(1);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { increment: existing.amount } },
      });
      const updateData = prisma.expense.update.mock.calls[0][0].data;
      expect(updateData.paidAt).toBeNull();
    });

    it("applies only the delta when the amount changes but status stays PAID on the same account", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PAID,
        amount: new Prisma.Decimal(1000),
      });
      prisma.expense.findFirst.mockResolvedValueOnce(existing);
      prisma.expense.update.mockResolvedValue({ ...existing, amount: new Prisma.Decimal(1500) });

      await service.update("user-1", "exp-1", { amount: 1500 });

      expect(prisma.account.update).toHaveBeenCalledTimes(1);
      const call = prisma.account.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: "acc-1" });
      expect((call.data.balance.decrement as Prisma.Decimal).toNumber()).toBeCloseTo(500);
    });

    it("reverses the old account and applies to the new one when the destination account changes", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PAID,
        amount: new Prisma.Decimal(1000),
      });
      prisma.expense.findFirst.mockResolvedValueOnce(existing);
      accountsService.assertOwnership.mockResolvedValue({ id: "acc-2" });
      prisma.expense.update.mockResolvedValue({ ...existing, accountId: "acc-2" });

      await service.update("user-1", "exp-1", { accountId: "acc-2" });

      expect(accountsService.assertOwnership).toHaveBeenCalledWith("user-1", "acc-2");
      expect(prisma.account.update).toHaveBeenCalledTimes(2);
      expect(prisma.account.update).toHaveBeenNthCalledWith(1, {
        where: { id: "acc-1" },
        data: { balance: { increment: existing.amount } },
      });
      expect(prisma.account.update).toHaveBeenNthCalledWith(2, {
        where: { id: "acc-2" },
        data: { balance: { decrement: 1000 } },
      });
    });

    it("never writes to the balance when a PENDING expense's amount changes", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PENDING,
        amount: new Prisma.Decimal(1000),
      });
      prisma.expense.findFirst.mockResolvedValueOnce(existing);
      prisma.expense.update.mockResolvedValue({ ...existing, amount: new Prisma.Decimal(1200) });

      await service.update("user-1", "exp-1", { amount: 1200 });

      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it("does not duplicate the balance impact when PAID stays PAID with nothing relevant changed", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PAID,
        amount: new Prisma.Decimal(1000),
      });
      prisma.expense.findFirst.mockResolvedValueOnce(existing);
      prisma.expense.update.mockResolvedValue(existing);

      await service.update("user-1", "exp-1", { description: "Novo nome" });

      expect(prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe("update — recurring next occurrence", () => {
    it("generates exactly one next occurrence when a recurring expense becomes PAID", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PENDING,
        isRecurring: true,
        recurrenceType: RecurrenceType.MONTHLY,
        dueDate: new Date("2026-08-15T00:00:00.000Z"),
      });
      prisma.expense.findFirst
        .mockResolvedValueOnce(existing) // ownership lookup
        .mockResolvedValueOnce(null); // no existing child yet
      prisma.expense.update.mockResolvedValue({ ...existing, status: ExpenseStatus.PAID });

      await service.update("user-1", "exp-1", { status: "PAID" });

      expect(prisma.expense.create).toHaveBeenCalledTimes(1);
      const createData = prisma.expense.create.mock.calls[0][0].data;
      expect(createData.parentExpenseId).toBe("exp-1");
      expect(createData.status).toBe(ExpenseStatus.PENDING);
      expect((createData.dueDate as Date).toISOString().slice(0, 10)).toBe("2026-09-15");
    });

    it("does not create a duplicate occurrence when a child already exists for the parent", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PENDING,
        isRecurring: true,
        recurrenceType: RecurrenceType.MONTHLY,
      });
      prisma.expense.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: "child-1", parentExpenseId: "exp-1" });
      prisma.expense.update.mockResolvedValue({ ...existing, status: ExpenseStatus.PAID });

      await service.update("user-1", "exp-1", { status: "PAID" });

      expect(prisma.expense.create).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("reverses the balance impact and deletes when the expense was PAID", async () => {
      const existing = buildExpense({
        status: ExpenseStatus.PAID,
        amount: new Prisma.Decimal(500),
      });
      prisma.expense.findFirst.mockResolvedValue(existing);

      await service.remove("user-1", "exp-1");

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { increment: existing.amount } },
      });
      expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: "exp-1" } });
    });

    it("deletes without touching the balance when the expense was PENDING", async () => {
      const existing = buildExpense({ status: ExpenseStatus.PENDING });
      prisma.expense.findFirst.mockResolvedValue(existing);

      await service.remove("user-1", "exp-1");

      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: "exp-1" } });
    });

    it("throws when the expense does not belong to the user", async () => {
      prisma.expense.findFirst.mockResolvedValue(null);

      await expect(service.remove("user-1", "exp-x")).rejects.toBeInstanceOf(
        ExpenseNotFoundException,
      );
      expect(prisma.expense.delete).not.toHaveBeenCalled();
    });
  });
});
