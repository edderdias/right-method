import { Prisma } from "@prisma/client";
import { ReportsService } from "./reports.service";

function createPrismaMock() {
  return {
    account: { aggregate: jest.fn() },
    revenue: { aggregate: jest.fn() },
    expense: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    category: { findMany: jest.fn() },
  };
}

function sum(value: number) {
  return { _sum: { amount: new Prisma.Decimal(value) } };
}

describe("ReportsService", () => {
  let prisma: any;
  let service: ReportsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ReportsService(prisma as any);
  });

  describe("resolvePeriod", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-08-12T15:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("defaults to the current month", () => {
      const period = service.resolvePeriod({});
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-08-01");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-08-31");
    });

    it("prioritizes explicit from/to over preset", () => {
      const period = service.resolvePeriod({
        from: "2026-01-01",
        to: "2026-01-15",
        preset: "this_year",
      } as any);
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-01-01");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-01-15");
    });

    it("resolves today", () => {
      const period = service.resolvePeriod({ preset: "today" } as any);
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-08-12");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-08-12");
    });

    it("resolves this_week starting on Monday", () => {
      const period = service.resolvePeriod({ preset: "this_week" } as any);
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-08-10");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-08-12");
    });

    it("resolves last_month as the full previous calendar month", () => {
      const period = service.resolvePeriod({ preset: "last_month" } as any);
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-07-01");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-07-31");
    });

    it("resolves last_3_months relative to today", () => {
      const period = service.resolvePeriod({ preset: "last_3_months" } as any);
      expect(period.from.toISOString().slice(0, 10)).toBe("2026-06-01");
      expect(period.to.toISOString().slice(0, 10)).toBe("2026-08-12");
    });

    it("resolves this_year and last_year", () => {
      expect(
        service
          .resolvePeriod({ preset: "this_year" } as any)
          .from.toISOString()
          .slice(0, 10),
      ).toBe("2026-01-01");
      const lastYear = service.resolvePeriod({ preset: "last_year" } as any);
      expect(lastYear.from.toISOString().slice(0, 10)).toBe("2025-01-01");
      expect(lastYear.to.toISOString().slice(0, 10)).toBe("2025-12-31");
    });
  });

  describe("resolvePreviousPeriod", () => {
    it("returns the immediately preceding period of the same length", () => {
      const period = {
        from: new Date("2026-08-01T00:00:00.000Z"),
        to: new Date("2026-08-31T00:00:00.000Z"),
      };
      const previous = service.resolvePreviousPeriod(period);
      expect(previous.from.toISOString().slice(0, 10)).toBe("2026-07-01");
      expect(previous.to.toISOString().slice(0, 10)).toBe("2026-07-31");
    });
  });

  describe("getSummary", () => {
    const period = {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    };

    it("computes current vs previous totals and percent variation", async () => {
      prisma.revenue.aggregate.mockResolvedValueOnce(sum(2000)).mockResolvedValueOnce(sum(1000));
      prisma.expense.aggregate.mockResolvedValueOnce(sum(800)).mockResolvedValueOnce(sum(1000));

      const summary = await service.getSummary("user-1", period);

      expect(summary.current).toEqual({
        period: { from: "2026-08-01", to: "2026-08-31" },
        income: 2000,
        expenses: 800,
        balance: 1200,
        savingsRatePct: 60,
      });
      expect(summary.previous.income).toBe(1000);
      expect(summary.previous.expenses).toBe(1000);
      expect(summary.previous.balance).toBe(0);
      expect(summary.variation.incomePct).toBe(100);
      expect(summary.variation.balancePct).toBeNull();
    });

    it("scopes both periods to accountId when provided", async () => {
      prisma.revenue.aggregate.mockResolvedValue(sum(0));
      prisma.expense.aggregate.mockResolvedValue(sum(0));

      await service.getSummary("user-1", period, "acc-1");

      for (const call of prisma.revenue.aggregate.mock.calls) {
        expect(call[0].where.accountId).toBe("acc-1");
      }
      for (const call of prisma.expense.aggregate.mock.calls) {
        expect(call[0].where.accountId).toBe("acc-1");
      }
    });
  });

  describe("getCashFlow", () => {
    const period = {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    };

    it("derives opening balance by undoing movements that happened after the period start", async () => {
      prisma.account.aggregate.mockResolvedValue({ _sum: { balance: new Prisma.Decimal(5000) } });
      // movements-after-from aggregates, then getPeriodTotals' own income/expense aggregates
      prisma.revenue.aggregate
        .mockResolvedValueOnce(sum(2000)) // income received after period.from (up to now)
        .mockResolvedValueOnce(sum(2000)); // income within the period itself
      prisma.expense.aggregate
        .mockResolvedValueOnce(sum(500)) // expenses paid after period.from (up to now)
        .mockResolvedValueOnce(sum(500)); // expenses within the period itself

      const cashFlow = await service.getCashFlow("user-1", period);

      // opening = currentBalance(5000) - (incomeAfterFrom(2000) - expenseAfterFrom(500)) = 3500
      expect(cashFlow.openingBalance).toBe(3500);
      expect(cashFlow.income).toBe(2000);
      expect(cashFlow.expenses).toBe(500);
      // closing = opening + income - expenses = 3500 + 2000 - 500 = 5000 (matches current balance
      // when period.to is today, since nothing happened after it)
      expect(cashFlow.closingBalance).toBe(5000);
    });
  });

  describe("getExpensesByCategory", () => {
    const period = {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    };

    it("groups PAID expenses by category with count and percentage of the total", async () => {
      prisma.expense.groupBy.mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: new Prisma.Decimal(1500) }, _count: { _all: 3 } },
        { categoryId: "cat-2", _sum: { amount: new Prisma.Decimal(500) }, _count: { _all: 1 } },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: "cat-1", name: "Moradia" },
        { id: "cat-2", name: "Lazer" },
      ]);

      const result = await service.getExpensesByCategory("user-1", period);

      expect(result).toEqual([
        { categoryId: "cat-1", name: "Moradia", total: 1500, count: 3, percentage: 75 },
        { categoryId: "cat-2", name: "Lazer", total: 500, count: 1, percentage: 25 },
      ]);
    });

    it("returns an empty array when there are no expenses in the period", async () => {
      prisma.expense.groupBy.mockResolvedValue([]);
      expect(await service.getExpensesByCategory("user-1", period)).toEqual([]);
    });
  });

  describe("getTopExpenses", () => {
    const period = {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    };

    it("returns the highest-amount PAID expenses in the period, ordered by amount desc", async () => {
      prisma.expense.findMany.mockResolvedValue([
        {
          id: "exp-1",
          description: "Aluguel",
          amount: new Prisma.Decimal(2000),
          paidAt: new Date("2026-08-05T00:00:00.000Z"),
          categoryId: "cat-1",
          category: { name: "Moradia" },
        },
      ]);

      const result = await service.getTopExpenses("user-1", period, 10);

      expect(result).toEqual([
        {
          id: "exp-1",
          description: "Aluguel",
          amount: 2000,
          paidAt: "2026-08-05",
          categoryId: "cat-1",
          categoryName: "Moradia",
        },
      ]);
      expect(prisma.expense.findMany.mock.calls[0][0].orderBy).toEqual({ amount: "desc" });
      expect(prisma.expense.findMany.mock.calls[0][0].take).toBe(10);
    });
  });
});
