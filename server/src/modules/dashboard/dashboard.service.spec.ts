import { Prisma } from "@prisma/client";
import { DashboardService } from "./dashboard.service";

function createPrismaMock() {
  return {
    account: { aggregate: jest.fn() },
    revenue: { aggregate: jest.fn(), groupBy: jest.fn() },
    expense: { aggregate: jest.fn(), groupBy: jest.fn() },
    category: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
}

function zeroSum() {
  return { _sum: { amount: new Prisma.Decimal(0) } };
}

describe("DashboardService", () => {
  let prisma: any;
  let service: DashboardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new DashboardService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe("resolvePeriod", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-08-12T15:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("defaults to the current month in América/São Paulo", () => {
      const period = service.resolvePeriod({});
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-08-01");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-08-31");
    });

    it("prioritizes explicit from/to over month/year", () => {
      const period = service.resolvePeriod({
        from: "2026-01-01",
        to: "2026-01-15",
        month: 8,
        year: 2026,
      } as any);
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-01-01");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-01-15");
    });

    it("computes the last30days preset relative to today", () => {
      const period = service.resolvePeriod({ preset: "last30days" } as any);
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-08-12");
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-07-14");
    });

    it("computes the last6months preset relative to today", () => {
      const period = service.resolvePeriod({ preset: "last6months" } as any);
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-08-12");
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-03-01");
    });
  });

  describe("getSummary", () => {
    const period = {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    };

    it("sums only RECEIVED revenues within the period for income.total; overdue ignores the period", async () => {
      prisma.account.aggregate.mockResolvedValue({ _sum: { balance: new Prisma.Decimal(5000) } });
      prisma.revenue.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(2000) } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(300) } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(150) } });
      prisma.expense.aggregate
        .mockResolvedValueOnce(zeroSum())
        .mockResolvedValueOnce(zeroSum())
        .mockResolvedValueOnce(zeroSum());

      const summary = await service.getSummary("user-1", period);

      expect(summary.currentBalance).toBe(5000);
      expect(summary.income).toEqual({ total: 2000, pending: 300, overdue: 150 });
      expect(summary.monthlySavings).toBe(2000);

      const receivedCall = prisma.revenue.aggregate.mock.calls[0][0];
      expect(receivedCall.where.status).toBe("RECEIVED");
      expect(receivedCall.where.receivedAt).toEqual({ gte: period.from, lte: period.to });

      const overdueCall = prisma.revenue.aggregate.mock.calls[2][0];
      expect(overdueCall.where.status).toBe("PENDING");
      expect(overdueCall.where.dueDate).not.toHaveProperty("gte");
    });

    it("sums only PAID expenses within the period for expenses.total; overdue ignores the period", async () => {
      prisma.account.aggregate.mockResolvedValue({ _sum: { balance: new Prisma.Decimal(5000) } });
      prisma.revenue.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(2000) } })
        .mockResolvedValueOnce(zeroSum())
        .mockResolvedValueOnce(zeroSum());
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(800) } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(120) } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(60) } });

      const summary = await service.getSummary("user-1", period);

      expect(summary.expenses).toEqual({ total: 800, pending: 120, overdue: 60 });
      expect(summary.monthlySavings).toBe(2000 - 800);

      const paidCall = prisma.expense.aggregate.mock.calls[0][0];
      expect(paidCall.where.status).toBe("PAID");
      expect(paidCall.where.paidAt).toEqual({ gte: period.from, lte: period.to });

      const overdueCall = prisma.expense.aggregate.mock.calls[2][0];
      expect(overdueCall.where.status).toBe("PENDING");
      expect(overdueCall.where.dueDate).not.toHaveProperty("gte");
    });
  });

  describe("getRevenuesEvolution", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-08-12T15:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("backfills months with no data as zero, only counting RECEIVED revenues", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { month: new Date("2026-06-01T00:00:00.000Z"), total: new Prisma.Decimal(1200) },
        { month: new Date("2026-08-01T00:00:00.000Z"), total: new Prisma.Decimal(500) },
      ]);

      const points = await service.getRevenuesEvolution("user-1", 3);

      expect(points).toEqual([
        { month: "2026-06", total: 1200 },
        { month: "2026-07", total: 0 },
        { month: "2026-08", total: 500 },
      ]);
    });
  });

  describe("getRevenuesByCategory", () => {
    const period = {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    };

    it("groups RECEIVED revenues by category and joins their names", async () => {
      prisma.revenue.groupBy.mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: new Prisma.Decimal(3000) } },
        { categoryId: "cat-2", _sum: { amount: new Prisma.Decimal(1000) } },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: "cat-1", name: "Salário" },
        { id: "cat-2", name: "Freelance" },
      ]);

      const result = await service.getRevenuesByCategory("user-1", period);

      expect(result).toEqual([
        { categoryId: "cat-1", name: "Salário", total: 3000 },
        { categoryId: "cat-2", name: "Freelance", total: 1000 },
      ]);
      expect(prisma.revenue.groupBy.mock.calls[0][0].where.status).toBe("RECEIVED");
    });
  });

  describe("getExpensesEvolution", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-08-12T15:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("backfills months with no data as zero, only counting PAID expenses", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { month: new Date("2026-06-01T00:00:00.000Z"), total: new Prisma.Decimal(900) },
        { month: new Date("2026-08-01T00:00:00.000Z"), total: new Prisma.Decimal(400) },
      ]);

      const points = await service.getExpensesEvolution("user-1", 3);

      expect(points).toEqual([
        { month: "2026-06", total: 900 },
        { month: "2026-07", total: 0 },
        { month: "2026-08", total: 400 },
      ]);
    });
  });

  describe("getExpensesByCategory", () => {
    const period = {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    };

    it("groups PAID expenses by category and joins their names", async () => {
      prisma.expense.groupBy.mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: new Prisma.Decimal(1800) } },
        { categoryId: "cat-2", _sum: { amount: new Prisma.Decimal(900) } },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: "cat-1", name: "Moradia" },
        { id: "cat-2", name: "Alimentação" },
      ]);

      const result = await service.getExpensesByCategory("user-1", period);

      expect(result).toEqual([
        { categoryId: "cat-1", name: "Moradia", total: 1800 },
        { categoryId: "cat-2", name: "Alimentação", total: 900 },
      ]);
      expect(prisma.expense.groupBy.mock.calls[0][0].where.status).toBe("PAID");
    });
  });
});
