import { FinancialGoalCategory, FinancialGoalStatus, GoalPriority, GoalTransactionType, Prisma } from "@prisma/client";
import { GoalInsufficientBalanceException } from "../../common/exceptions/app.exception";
import { GoalTransactionsService } from "./goal-transactions.service";

function createPrismaMock() {
  const prisma: any = {
    account: { findFirst: jest.fn() },
    goalTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    financialGoal: {
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

function buildGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: "goal-1",
    userId: "user-1",
    name: "Reserva de emergência",
    description: null,
    category: FinancialGoalCategory.RESERVA_EMERGENCIA,
    priority: GoalPriority.MEDIUM,
    targetAmount: new Prisma.Decimal(10000),
    initialAmount: new Prisma.Decimal(1000),
    currentAmount: new Prisma.Decimal(1000),
    startDate: new Date(),
    targetDate: new Date("2027-01-01T00:00:00.000Z"),
    status: FinancialGoalStatus.ACTIVE,
    linkedAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GoalTransactionsService", () => {
  let prisma: any;
  let notifications: any;
  let service: GoalTransactionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    notifications = { create: jest.fn() };
    service = new GoalTransactionsService(prisma, notifications);
  });

  describe("create", () => {
    it("rejects a WITHDRAW larger than the goal's currentAmount", async () => {
      const goal = buildGoal({ currentAmount: new Prisma.Decimal(500) });

      await expect(
        service.create("user-1", goal as any, {
          type: GoalTransactionType.WITHDRAW,
          amount: 600,
          transactionDate: "2026-08-18",
        } as any),
      ).rejects.toBeInstanceOf(GoalInsufficientBalanceException);
      expect(prisma.goalTransaction.create).not.toHaveBeenCalled();
    });

    it("flips the goal to COMPLETED once a DEPOSIT reaches the target", async () => {
      const goal = buildGoal({
        targetAmount: new Prisma.Decimal(10000),
        currentAmount: new Prisma.Decimal(9500),
      });
      prisma.goalTransaction.create.mockResolvedValue({
        id: "tx-1",
        amount: new Prisma.Decimal(600),
        type: GoalTransactionType.DEPOSIT,
      });

      await service.create("user-1", goal as any, {
        type: GoalTransactionType.DEPOSIT,
        amount: 600,
        transactionDate: "2026-08-18",
      } as any);

      expect(prisma.financialGoal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: { currentAmount: 10100, status: FinancialGoalStatus.COMPLETED },
      });
    });

    it("does not touch status when the deposit does not reach the target", async () => {
      const goal = buildGoal();
      prisma.goalTransaction.create.mockResolvedValue({
        id: "tx-1",
        amount: new Prisma.Decimal(200),
        type: GoalTransactionType.DEPOSIT,
      });

      await service.create("user-1", goal as any, {
        type: GoalTransactionType.DEPOSIT,
        amount: 200,
        transactionDate: "2026-08-18",
      } as any);

      expect(prisma.financialGoal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: { currentAmount: 1200 },
      });
    });
  });

  describe("remove", () => {
    it("reverts a DEPOSIT and drops the goal back to ACTIVE if it was COMPLETED", async () => {
      prisma.goalTransaction.findFirst.mockResolvedValue({
        id: "tx-1",
        goalId: "goal-1",
        type: GoalTransactionType.DEPOSIT,
        amount: new Prisma.Decimal(1000),
      });
      prisma.financialGoal.findUniqueOrThrow.mockResolvedValue(
        buildGoal({
          targetAmount: new Prisma.Decimal(10000),
          currentAmount: new Prisma.Decimal(10000),
          status: FinancialGoalStatus.COMPLETED,
        }),
      );

      await service.remove("user-1", "tx-1");

      expect(prisma.goalTransaction.delete).toHaveBeenCalledWith({ where: { id: "tx-1" } });
      expect(prisma.financialGoal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: { currentAmount: 9000, status: FinancialGoalStatus.ACTIVE },
      });
    });
  });
});
