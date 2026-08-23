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
import type { ReportsQueryDto } from "./dto/reports-query.dto";

export interface ReportPeriod {
  from: Date;
  to: Date;
}

export interface ReportPeriodTotals {
  period: { from: string; to: string };
  income: number;
  expenses: number;
  balance: number;
  savingsRatePct: number;
}

export interface ReportSummary {
  current: ReportPeriodTotals;
  previous: ReportPeriodTotals;
  variation: {
    incomePct: number | null;
    expensesPct: number | null;
    balancePct: number | null;
  };
}

export interface ReportCashFlow {
  period: { from: string; to: string };
  openingBalance: number;
  income: number;
  expenses: number;
  closingBalance: number;
}

export interface ReportExpenseByCategory {
  categoryId: string;
  name: string;
  total: number;
  count: number;
  percentage: number;
}

export interface ReportTopExpense {
  id: string;
  description: string;
  amount: number;
  paidAt: string;
  categoryId: string;
  categoryName: string;
}

function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  resolvePeriod(query: ReportsQueryDto): ReportPeriod {
    if (query.from && query.to) {
      return { from: parseDateOnly(query.from), to: parseDateOnly(query.to) };
    }

    const today = startOfTodaySaoPaulo();
    const firstOfCurrentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    switch (query.preset) {
      case "today":
        return { from: today, to: today };
      case "this_week": {
        const dayOfWeek = today.getUTCDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return { from: addDaysToDateOnly(today, -diffToMonday), to: today };
      }
      case "last_month": {
        const firstOfLastMonth = addMonthsToDateOnly(firstOfCurrentMonth, -1);
        return { from: firstOfLastMonth, to: addDaysToDateOnly(firstOfCurrentMonth, -1) };
      }
      case "last_3_months":
        return { from: addMonthsToDateOnly(firstOfCurrentMonth, -2), to: today };
      case "last_6_months":
        return { from: addMonthsToDateOnly(firstOfCurrentMonth, -5), to: today };
      case "this_year":
        return {
          from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
          to: new Date(Date.UTC(today.getUTCFullYear(), 11, 31)),
        };
      case "last_year":
        return {
          from: new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1)),
          to: new Date(Date.UTC(today.getUTCFullYear() - 1, 11, 31)),
        };
      case "this_month":
      default:
        return {
          from: firstOfCurrentMonth,
          to: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)),
        };
    }
  }

  /** Same-length period immediately preceding `period`, used for period-over-period comparisons. */
  resolvePreviousPeriod(period: ReportPeriod): ReportPeriod {
    const spanDays = Math.round((period.to.getTime() - period.from.getTime()) / 86_400_000);
    const to = addDaysToDateOnly(period.from, -1);
    return { from: addDaysToDateOnly(to, -spanDays), to };
  }

  private async getPeriodTotals(
    userId: string,
    period: ReportPeriod,
    accountId?: string,
  ): Promise<ReportPeriodTotals> {
    const revenueWhere: Prisma.RevenueWhereInput = {
      userId,
      status: RevenueStatus.RECEIVED,
      receivedAt: { gte: period.from, lte: period.to },
    };
    const expenseWhere: Prisma.ExpenseWhereInput = {
      userId,
      status: ExpenseStatus.PAID,
      paidAt: { gte: period.from, lte: period.to },
    };
    if (accountId) {
      revenueWhere.accountId = accountId;
      expenseWhere.accountId = accountId;
    }

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.revenue.aggregate({ where: revenueWhere, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expenses = Number(expenseAgg._sum.amount ?? 0);
    const balance = income - expenses;

    return {
      period: { from: formatDateOnly(period.from), to: formatDateOnly(period.to) },
      income,
      expenses,
      balance,
      savingsRatePct: income > 0 ? Math.round((balance / income) * 1000) / 10 : 0,
    };
  }

  async getSummary(
    userId: string,
    period: ReportPeriod,
    accountId?: string,
  ): Promise<ReportSummary> {
    const previousPeriod = this.resolvePreviousPeriod(period);
    const [current, previous] = await Promise.all([
      this.getPeriodTotals(userId, period, accountId),
      this.getPeriodTotals(userId, previousPeriod, accountId),
    ]);

    return {
      current,
      previous,
      variation: {
        incomePct: percentChange(previous.income, current.income),
        expensesPct: percentChange(previous.expenses, current.expenses),
        balancePct: percentChange(previous.balance, current.balance),
      },
    };
  }

  /** Reconstructs the balance at the start of the period by undoing every RECEIVED/PAID
   * movement that happened after it, then walks it forward through the period's own totals. */
  async getCashFlow(
    userId: string,
    period: ReportPeriod,
    accountId?: string,
  ): Promise<ReportCashFlow> {
    const balanceWhere: Prisma.AccountWhereInput = accountId
      ? { id: accountId, userId }
      : { userId };
    const revenueAfterFromWhere: Prisma.RevenueWhereInput = {
      userId,
      status: RevenueStatus.RECEIVED,
      receivedAt: { gt: period.from },
    };
    const expenseAfterFromWhere: Prisma.ExpenseWhereInput = {
      userId,
      status: ExpenseStatus.PAID,
      paidAt: { gt: period.from },
    };
    if (accountId) {
      revenueAfterFromWhere.accountId = accountId;
      expenseAfterFromWhere.accountId = accountId;
    }

    const [balanceAgg, incomeAfterFromAgg, expenseAfterFromAgg, totals] = await Promise.all([
      this.prisma.account.aggregate({ where: balanceWhere, _sum: { balance: true } }),
      this.prisma.revenue.aggregate({ where: revenueAfterFromWhere, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: expenseAfterFromWhere, _sum: { amount: true } }),
      this.getPeriodTotals(userId, period, accountId),
    ]);

    const currentBalance = Number(balanceAgg._sum.balance ?? 0);
    const movementsAfterFrom =
      Number(incomeAfterFromAgg._sum.amount ?? 0) - Number(expenseAfterFromAgg._sum.amount ?? 0);
    const openingBalance = currentBalance - movementsAfterFrom;

    return {
      period: totals.period,
      openingBalance,
      income: totals.income,
      expenses: totals.expenses,
      closingBalance: openingBalance + totals.income - totals.expenses,
    };
  }

  async getExpensesByCategory(
    userId: string,
    period: ReportPeriod,
    accountId?: string,
    categoryId?: string,
  ): Promise<ReportExpenseByCategory[]> {
    const where: Prisma.ExpenseWhereInput = {
      userId,
      status: ExpenseStatus.PAID,
      paidAt: { gte: period.from, lte: period.to },
    };
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;

    const grouped = await this.prisma.expense.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });

    if (grouped.length === 0) return [];

    const categories = await this.prisma.category.findMany({
      where: { id: { in: grouped.map((group) => group.categoryId) } },
    });
    const nameById = new Map(categories.map((category) => [category.id, category.name]));
    const totalAmount = grouped.reduce((sum, group) => sum + Number(group._sum.amount ?? 0), 0);

    return grouped
      .map((group) => {
        const total = Number(group._sum.amount ?? 0);
        return {
          categoryId: group.categoryId,
          name: nameById.get(group.categoryId) ?? "Outros",
          total,
          count: group._count._all,
          percentage: totalAmount > 0 ? Math.round((total / totalAmount) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  async getTopExpenses(
    userId: string,
    period: ReportPeriod,
    limit: number,
    accountId?: string,
    categoryId?: string,
  ): Promise<ReportTopExpense[]> {
    const where: Prisma.ExpenseWhereInput = {
      userId,
      status: ExpenseStatus.PAID,
      paidAt: { gte: period.from, lte: period.to },
    };
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;

    const expenses = await this.prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { amount: "desc" },
      take: limit,
    });

    return expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      paidAt: formatDateOnly(expense.paidAt as Date),
      categoryId: expense.categoryId,
      categoryName: expense.category.name,
    }));
  }
}
