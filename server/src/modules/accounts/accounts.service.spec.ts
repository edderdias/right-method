import {
  AccountInUseException,
  InvalidAccountTransferException,
} from "../../common/exceptions/app.exception";
import { AccountsService } from "./accounts.service";

function createPrismaMock() {
  const prisma: any = {
    account: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    accountTransfer: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    revenue: { count: jest.fn(), groupBy: jest.fn() },
    expense: { count: jest.fn(), groupBy: jest.fn() },
    financialGoal: { count: jest.fn() },
    goalTransaction: { count: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

describe("AccountsService", () => {
  let prisma: any;
  let service: AccountsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AccountsService(prisma as any);
  });

  describe("listForUser", () => {
    it("scopes the query by the given userId", async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await service.listForUser("user-1");

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });
  });

  describe("create", () => {
    it("creates an account with balance 0 when initialBalance is omitted", async () => {
      prisma.account.create.mockResolvedValue({ id: "acc-1" });

      await service.create("user-1", { name: "Conta corrente" });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { userId: "user-1", name: "Conta corrente", balance: 0 },
      });
    });

    it("creates an account with the given initialBalance", async () => {
      prisma.account.create.mockResolvedValue({ id: "acc-1" });

      await service.create("user-1", { name: "Poupança", initialBalance: 250.5 });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { userId: "user-1", name: "Poupança", balance: 250.5 },
      });
    });
  });

  describe("remove", () => {
    it("throws AccountInUseException when the account has linked entries", async () => {
      prisma.account.findFirst.mockResolvedValue({ id: "acc-1", userId: "user-1" });
      prisma.revenue.count.mockResolvedValue(2);
      prisma.expense.count.mockResolvedValue(0);
      prisma.accountTransfer.count.mockResolvedValue(0);
      prisma.financialGoal.count.mockResolvedValue(0);
      prisma.goalTransaction.count.mockResolvedValue(0);

      await expect(service.remove("user-1", "acc-1")).rejects.toBeInstanceOf(AccountInUseException);
      expect(prisma.account.delete).not.toHaveBeenCalled();
    });

    it("deletes an account with no linked entries", async () => {
      prisma.account.findFirst.mockResolvedValue({ id: "acc-1", userId: "user-1" });
      prisma.revenue.count.mockResolvedValue(0);
      prisma.expense.count.mockResolvedValue(0);
      prisma.accountTransfer.count.mockResolvedValue(0);
      prisma.financialGoal.count.mockResolvedValue(0);
      prisma.goalTransaction.count.mockResolvedValue(0);

      await service.remove("user-1", "acc-1");

      expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: "acc-1" } });
    });
  });

  describe("transfer", () => {
    it("rejects a transfer between the same account", async () => {
      await expect(
        service.transfer("user-1", {
          fromAccountId: "acc-1",
          toAccountId: "acc-1",
          amount: 100,
          transferDate: "2026-08-27",
        }),
      ).rejects.toBeInstanceOf(InvalidAccountTransferException);
    });

    it("moves balance between accounts and flags insufficient funds", async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce({ id: "acc-1", userId: "user-1", balance: 50 })
        .mockResolvedValueOnce({ id: "acc-2", userId: "user-1", balance: 0 });
      prisma.accountTransfer.create.mockResolvedValue({
        id: "tr-1",
        fromAccountId: "acc-1",
        toAccountId: "acc-2",
        amount: 100,
        transferDate: new Date("2026-08-27T00:00:00.000Z"),
        description: null,
        createdAt: new Date(),
        fromAccount: { name: "A" },
        toAccount: { name: "B" },
      });

      const result = await service.transfer("user-1", {
        fromAccountId: "acc-1",
        toAccountId: "acc-2",
        amount: 100,
        transferDate: "2026-08-27",
      });

      expect(result.insufficientFunds).toBe(true);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { balance: { decrement: 100 } },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-2" },
        data: { balance: { increment: 100 } },
      });
    });
  });
});
