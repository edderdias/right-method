import { FinancialGoalCategory, FinancialGoalStatus, GoalPriority, Prisma } from "@prisma/client";
import {
  FinancialGoalArchivedException,
  FinancialGoalNotFoundException,
} from "../../common/exceptions/app.exception";
import { FinancialGoalsService } from "./financial-goals.service";

function createPrismaMock() {
  const prisma: any = {
    financialGoal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    goalTransaction: {
      count: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    goalInvestmentLink: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    account: {
      findFirst: jest.fn(),
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
    targetAmount: new Prisma.Decimal(30000),
    initialAmount: new Prisma.Decimal(5000),
    currentAmount: new Prisma.Decimal(5000),
    startDate: new Date("2026-08-01T00:00:00.000Z"),
    targetDate: new Date("2027-12-31T00:00:00.000Z"),
    status: FinancialGoalStatus.ACTIVE,
    linkedAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("FinancialGoalsService", () => {
  let prisma: any;
  let service: FinancialGoalsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new FinancialGoalsService(prisma);
  });

  describe("create", () => {
    it("starts currentAmount at initialAmount and defaults status to ACTIVE", async () => {
      prisma.financialGoal.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildGoal({ ...data })),
      );

      const result = await service.create("user-1", {
        name: "Viagem",
        category: FinancialGoalCategory.VIAGEM,
        targetAmount: 18000,
        initialAmount: 2000,
        startDate: "2026-08-01",
        targetDate: "2027-08-01",
      } as any);

      expect(prisma.financialGoal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: FinancialGoalStatus.ACTIVE,
            initialAmount: 2000,
            currentAmount: 2000,
          }),
        }),
      );
      expect(result.currentAmount).toBe(2000);
      expect(result.progressPct).toBe(11);
    });
  });

  describe("update", () => {
    it("throws when the goal does not belong to the user", async () => {
      prisma.financialGoal.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "goal-x", { name: "Novo nome" } as any),
      ).rejects.toBeInstanceOf(FinancialGoalNotFoundException);
    });
  });

  describe("archiveOrDelete", () => {
    it("hard-deletes a goal with no transaction history", async () => {
      prisma.financialGoal.findFirst.mockResolvedValue(buildGoal());
      prisma.goalTransaction.count.mockResolvedValue(0);

      const result = await service.archiveOrDelete("user-1", "goal-1");

      expect(result.archived).toBe(false);
      expect(prisma.financialGoal.delete).toHaveBeenCalledWith({ where: { id: "goal-1" } });
      expect(prisma.financialGoal.update).not.toHaveBeenCalled();
    });

    it("archives a goal that has contribution/withdrawal history instead of deleting it", async () => {
      prisma.financialGoal.findFirst.mockResolvedValue(buildGoal());
      prisma.goalTransaction.count.mockResolvedValue(4);

      const result = await service.archiveOrDelete("user-1", "goal-1");

      expect(result.archived).toBe(true);
      expect(prisma.financialGoal.delete).not.toHaveBeenCalled();
      expect(prisma.financialGoal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: { status: FinancialGoalStatus.ARCHIVED },
      });
    });
  });

  describe("assertOwnedActiveGoal", () => {
    it("rejects new transactions on an archived goal", async () => {
      prisma.financialGoal.findFirst.mockResolvedValue(
        buildGoal({ status: FinancialGoalStatus.ARCHIVED }),
      );

      await expect(service.assertOwnedActiveGoal("user-1", "goal-1")).rejects.toBeInstanceOf(
        FinancialGoalArchivedException,
      );
    });
  });

  describe("card metrics", () => {
    it("caps progressPct at 100 and reports the exceeded amount when currentAmount overshoots the target", async () => {
      prisma.financialGoal.findFirst.mockResolvedValue(
        buildGoal({
          targetAmount: new Prisma.Decimal(10000),
          currentAmount: new Prisma.Decimal(11000),
          status: FinancialGoalStatus.COMPLETED,
        }),
      );
      prisma.goalTransaction.findMany.mockResolvedValue([]);
      prisma.goalInvestmentLink.findMany.mockResolvedValue([]);

      const detail = await service.findOne("user-1", "goal-1");

      expect(detail.progressPct).toBe(100);
      expect(detail.remainingAmount).toBe(0);
      expect(detail.exceededAmount).toBe(1000);
      expect(detail.isOverdue).toBe(false);
    });

    it("flags a goal as overdue when the target date is in the past and it is still ACTIVE", async () => {
      prisma.financialGoal.findFirst.mockResolvedValue(
        buildGoal({ targetDate: new Date("2020-01-01T00:00:00.000Z") }),
      );
      prisma.goalTransaction.findMany.mockResolvedValue([]);
      prisma.goalInvestmentLink.findMany.mockResolvedValue([]);

      const detail = await service.findOne("user-1", "goal-1");

      expect(detail.isOverdue).toBe(true);
    });
  });

  describe("getSummary", () => {
    it("aggregates target/current totals and counts across ACTIVE/PAUSED/COMPLETED goals", async () => {
      prisma.financialGoal.findMany.mockResolvedValue([
        buildGoal({ targetAmount: new Prisma.Decimal(10000), currentAmount: new Prisma.Decimal(10000), status: FinancialGoalStatus.COMPLETED }),
        buildGoal({ id: "goal-2", targetAmount: new Prisma.Decimal(20000), currentAmount: new Prisma.Decimal(5000), status: FinancialGoalStatus.ACTIVE }),
      ]);

      const summary = await service.getSummary("user-1");

      expect(summary.activeCount).toBe(1);
      expect(summary.completedCount).toBe(1);
      expect(summary.totalTargetAmount).toBe(30000);
      expect(summary.totalCurrentAmount).toBe(15000);
      expect(summary.overallProgressPct).toBe(50);
    });

    it("returns zeroed totals when there are no goals", async () => {
      prisma.financialGoal.findMany.mockResolvedValue([]);

      const summary = await service.getSummary("user-1");

      expect(summary).toEqual({
        activeCount: 0,
        completedCount: 0,
        totalTargetAmount: 0,
        totalCurrentAmount: 0,
        overallProgressPct: 0,
      });
    });
  });
});
