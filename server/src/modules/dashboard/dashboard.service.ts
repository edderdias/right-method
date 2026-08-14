import { Injectable } from "@nestjs/common";
import { ExpenseStatus, Prisma, RevenueStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  addDaysToDateOnly,
  addMonthsToDateOnly,
  formatDateOnly,
  parseDateOnly,
  startOfTodaySaoPaulo,
} from "../../common/utils/date-only";
import type { DashboardPeriodQueryDto } from "./dto/dashboard-period-query.dto";

export interface DashboardPeriod {
  from: Date;
  to: Date;
}

export interface DashboardSummary {
  currentBalance: number;
  period: { from: string; to: string };
  income: { total: number; pending: number; overdue: number };
  expenses: { total: number; pending: number; overdue: number };
  monthlySavings: number;
}

export interface RevenuesEvolutionPoint {
  month: string;
  total: number;
}

export interface RevenuesByCategoryPoint {
  categoryId: string;
  name: string;
  total: number;
}

export type ExpensesEvolutionPoint = RevenuesEvolutionPoint;
export type ExpensesByCategoryPoint = RevenuesByCategoryPoint;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  resolvePeriod(query: DashboardPeriodQueryDto): DashboardPeriod {
    if (query.from && query.to) {
      return { from: parseDateOnly(query.from), to: parseDateOnly(query.to) };
    }

    if (query.preset === "last30days") {
      const to = startOfTodaySaoPaulo();
      return { from: addDaysToDateOnly(to, -29), to };
    }

    if (query.preset === "last6months") {
      const to = startOfTodaySaoPaulo();
      const firstOfCurrentMonth = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      return { from: addMonthsToDateOnly(firstOfCurrentMonth, -5), to };
    }

    if (query.month && query.year) {
      return {
        from: new Date(Date.UTC(query.year, query.month - 1, 1)),
        to: new Date(Date.UTC(query.year, query.month, 0)),
      };
    }

    if (query.year) {
      return {
        from: new Date(Date.UTC(query.year, 0, 1)),
        to: new Date(Date.UTC(query.year, 11, 31)),
      };
    }

    const today = startOfTodaySaoPaulo();
    return {
      from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
      to: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)),
    };
  }

  async getSummary(userId: string, period: DashboardPeriod): Promise<DashboardSummary> {
    const today = startOfTodaySaoPaulo();

    const [
      balanceAgg,
      receivedAgg,
      pendingAgg,
      overdueAgg,
      expensesPaidAgg,
      expensesPendingAgg,
      expensesOverdueAgg,
    ] = await Promise.all([
      this.prisma.account.aggregate({ where: { userId }, _sum: { balance: true } }),
      this.prisma.revenue.aggregate({
        where: {
          userId,
          status: RevenueStatus.RECEIVED,
          receivedAt: { gte: period.from, lte: period.to },
        },
        _sum: { amount: true },
      }),
      this.prisma.revenue.aggregate({
        where: {
          userId,
          status: RevenueStatus.PENDING,
          dueDate: { gte: period.from, lte: period.to },
        },
        _sum: { amount: true },
      }),
      this.prisma.revenue.aggregate({
        where: { userId, status: RevenueStatus.PENDING, dueDate: { lt: today } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          status: ExpenseStatus.PAID,
          paidAt: { gte: period.from, lte: period.to },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          status: ExpenseStatus.PENDING,
          dueDate: { gte: period.from, lte: period.to },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, status: ExpenseStatus.PENDING, dueDate: { lt: today } },
        _sum: { amount: true },
      }),
    ]);

    const currentBalance = Number(balanceAgg._sum.balance ?? 0);
    const incomeTotal = Number(receivedAgg._sum.amount ?? 0);
    const incomePending = Number(pendingAgg._sum.amount ?? 0);
    const incomeOverdue = Number(overdueAgg._sum.amount ?? 0);
    const expensesTotal = Number(expensesPaidAgg._sum.amount ?? 0);
    const expensesPending = Number(expensesPendingAgg._sum.amount ?? 0);
    const expensesOverdue = Number(expensesOverdueAgg._sum.amount ?? 0);

    return {
      currentBalance,
      period: { from: formatDateOnly(period.from), to: formatDateOnly(period.to) },
      income: { total: incomeTotal, pending: incomePending, overdue: incomeOverdue },
      expenses: { total: expensesTotal, pending: expensesPending, overdue: expensesOverdue },
      monthlySavings: incomeTotal - expensesTotal,
    };
  }

  async getRevenuesEvolution(userId: string, months: number): Promise<RevenuesEvolutionPoint[]> {
    const today = startOfTodaySaoPaulo();
    const firstOfCurrentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const windowStart = addMonthsToDateOnly(firstOfCurrentMonth, -(months - 1));

    const rows = await this.prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal }>>(
      Prisma.sql`
        SELECT DATE_TRUNC('month', "receivedAt") AS month, SUM(amount) AS total
        FROM revenues
        WHERE "userId" = ${userId}
          AND status = ${RevenueStatus.RECEIVED}::"RevenueStatus"
          AND "receivedAt" >= ${windowStart}
        GROUP BY month
        ORDER BY month ASC
      `,
    );

    const totalsByMonthKey = new Map<string, number>();
    for (const row of rows) {
      totalsByMonthKey.set(formatDateOnly(row.month).slice(0, 7), Number(row.total ?? 0));
    }

    const points: RevenuesEvolutionPoint[] = [];
    for (let i = 0; i < months; i += 1) {
      const monthDate = addMonthsToDateOnly(windowStart, i);
      const key = formatDateOnly(monthDate).slice(0, 7);
      points.push({ month: key, total: totalsByMonthKey.get(key) ?? 0 });
    }

    return points;
  }

  async getRevenuesByCategory(
    userId: string,
    period: DashboardPeriod,
  ): Promise<RevenuesByCategoryPoint[]> {
    const grouped = await this.prisma.revenue.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        status: RevenueStatus.RECEIVED,
        receivedAt: { gte: period.from, lte: period.to },
      },
      _sum: { amount: true },
    });

    if (grouped.length === 0) {
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: grouped.map((group) => group.categoryId) } },
    });
    const nameById = new Map(categories.map((category) => [category.id, category.name]));

    return grouped
      .map((group) => ({
        categoryId: group.categoryId,
        name: nameById.get(group.categoryId) ?? "Outros",
        total: Number(group._sum.amount ?? 0),
      }))
      .sort((a, b) => b.total - a.total);
  }

  async getExpensesEvolution(userId: string, months: number): Promise<ExpensesEvolutionPoint[]> {
    const today = startOfTodaySaoPaulo();
    const firstOfCurrentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const windowStart = addMonthsToDateOnly(firstOfCurrentMonth, -(months - 1));

    const rows = await this.prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal }>>(
      Prisma.sql`
        SELECT DATE_TRUNC('month', "paidAt") AS month, SUM(amount) AS total
        FROM expenses
        WHERE "userId" = ${userId}
          AND status = ${ExpenseStatus.PAID}::"ExpenseStatus"
          AND "paidAt" >= ${windowStart}
        GROUP BY month
        ORDER BY month ASC
      `,
    );

    const totalsByMonthKey = new Map<string, number>();
    for (const row of rows) {
      totalsByMonthKey.set(formatDateOnly(row.month).slice(0, 7), Number(row.total ?? 0));
    }

    const points: ExpensesEvolutionPoint[] = [];
    for (let i = 0; i < months; i += 1) {
      const monthDate = addMonthsToDateOnly(windowStart, i);
      const key = formatDateOnly(monthDate).slice(0, 7);
      points.push({ month: key, total: totalsByMonthKey.get(key) ?? 0 });
    }

    return points;
  }

  async getExpensesByCategory(
    userId: string,
    period: DashboardPeriod,
  ): Promise<ExpensesByCategoryPoint[]> {
    const grouped = await this.prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        status: ExpenseStatus.PAID,
        paidAt: { gte: period.from, lte: period.to },
      },
      _sum: { amount: true },
    });

    if (grouped.length === 0) {
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: grouped.map((group) => group.categoryId) } },
    });
    const nameById = new Map(categories.map((category) => [category.id, category.name]));

    return grouped
      .map((group) => ({
        categoryId: group.categoryId,
        name: nameById.get(group.categoryId) ?? "Outros",
        total: Number(group._sum.amount ?? 0),
      }))
      .sort((a, b) => b.total - a.total);
  }
}
