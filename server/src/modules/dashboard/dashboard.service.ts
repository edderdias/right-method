import { Injectable } from "@nestjs/common";
import { CreditCardInvoiceStatus, ExpenseStatus, Prisma, RevenueStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  addDaysToDateOnly,
  addMonthsToDateOnly,
  formatDateOnly,
  parseDateOnly,
  startOfTodaySaoPaulo,
} from "../../common/utils/date-only";
import { AccountsService } from "../accounts/accounts.service";
import type { AccountsPeriodSummary, AccountsSummaryPeriodQuery } from "../accounts/accounts.service";
import { ReportsService } from "../reports/reports.service";
import { CreditCardsService } from "../credit-cards/credit-cards.service";
import type { ReportsQueryDto } from "../reports/dto/reports-query.dto";
import type { DashboardPeriodQueryDto } from "./dto/dashboard-period-query.dto";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type DashboardInsightTone = "primary" | "warning" | "info";

export interface DashboardInsight {
  text: string;
  tone: DashboardInsightTone;
}

export interface UpcomingBill {
  kind: "expense" | "invoice";
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  link: string;
}

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly reportsService: ReportsService,
    private readonly creditCardsService: CreditCardsService,
  ) {}

  getAccountsSummary(
    userId: string,
    query: AccountsSummaryPeriodQuery,
  ): Promise<AccountsPeriodSummary> {
    return this.accountsService.getPeriodSummary(userId, query);
  }

  async getUpcomingBills(userId: string, days = 15): Promise<UpcomingBill[]> {
    const today = startOfTodaySaoPaulo();
    const until = addDaysToDateOnly(today, days);

    const [expenses, invoices] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          userId,
          status: ExpenseStatus.PENDING,
          dueDate: { gte: today, lte: until },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
      }),
      this.prisma.creditCardInvoice.findMany({
        where: {
          userId,
          status: { not: CreditCardInvoiceStatus.PAID },
          dueDate: { gte: today, lte: until },
        },
        include: { card: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 20,
      }),
    ]);

    const bills: UpcomingBill[] = [
      ...expenses.map((expense) => ({
        kind: "expense" as const,
        id: expense.id,
        description: expense.description,
        dueDate: formatDateOnly(expense.dueDate),
        amount: Number(expense.amount),
        link: "/despesas",
      })),
      ...invoices.map((invoice) => ({
        kind: "invoice" as const,
        id: invoice.id,
        description: `Fatura ${invoice.card.name}`,
        dueDate: formatDateOnly(invoice.dueDate),
        amount: Number(invoice.totalAmount),
        link: "/cartoes",
      })),
    ];

    return bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 8);
  }

  /** Rule-based insights computed from real data (no LLM call) — powers the dashboard's
   * "Resumo do Certo IA" card. Every number comes from the same services as the rest of the app. */
  async getInsights(userId: string): Promise<DashboardInsight[]> {
    const period = this.reportsService.resolvePeriod({} as ReportsQueryDto);
    const previousPeriod = this.reportsService.resolvePreviousPeriod(period);

    const [summary, currentByCategory, previousByCategory, cardSummary] = await Promise.all([
      this.reportsService.getSummary(userId, period),
      this.reportsService.getExpensesByCategory(userId, period),
      this.reportsService.getExpensesByCategory(userId, previousPeriod),
      this.creditCardsService.getSummary(userId).catch(() => null),
    ]);

    const insights: DashboardInsight[] = [];

    if (summary.current.income > 0) {
      const rate = summary.current.savingsRatePct;
      if (rate >= 20) {
        insights.push({
          text: `Sua taxa de poupança este mês está em ${rate}%, acima dos 20% recomendados. Continue assim!`,
          tone: "primary",
        });
      } else if (summary.current.balance < 0) {
        insights.push({
          text: `Este mês você gastou ${formatBRL(Math.abs(summary.current.balance))} a mais do que recebeu. Vale revisar as despesas.`,
          tone: "warning",
        });
      } else {
        insights.push({
          text: `Sua taxa de poupança este mês está em ${rate}%. Uma meta saudável é guardar pelo menos 20% da renda.`,
          tone: "info",
        });
      }
    }

    const previousTotalByCategory = new Map(
      previousByCategory.map((category) => [category.categoryId, category.total]),
    );
    let biggestJump: { name: string; pct: number; delta: number } | null = null;
    for (const category of currentByCategory) {
      const previousTotal = previousTotalByCategory.get(category.categoryId) ?? 0;
      if (previousTotal <= 0) continue;
      const pct = Math.round(((category.total - previousTotal) / previousTotal) * 100);
      if (pct >= 15 && (!biggestJump || pct > biggestJump.pct)) {
        biggestJump = { name: category.name, pct, delta: category.total - previousTotal };
      }
    }
    if (biggestJump) {
      insights.push({
        text: `Seus gastos com ${biggestJump.name} subiram ${biggestJump.pct}% em relação ao mês passado (+${formatBRL(biggestJump.delta)}).`,
        tone: "warning",
      });
    } else if (currentByCategory.length > 0) {
      const top = currentByCategory[0]!;
      insights.push({
        text: `Sua maior despesa este mês é ${top.name}: ${formatBRL(top.total)} (${top.percentage}% do total).`,
        tone: "info",
      });
    }

    if (cardSummary && cardSummary.openInvoicesTotal > 0) {
      const highUsage =
        cardSummary.totalLimit > 0 &&
        cardSummary.totalUsed / cardSummary.totalLimit > 0.7;
      insights.push({
        text: `Você tem ${formatBRL(cardSummary.openInvoicesTotal)} em faturas de cartão em aberto${
          highUsage ? " e já usou mais de 70% do limite" : ""
        }. Programe-se para o pagamento.`,
        tone: highUsage ? "warning" : "info",
      });
    }

    if (insights.length === 0) {
      insights.push({
        text: "Cadastre suas receitas e despesas do mês para receber análises personalizadas da Certo IA.",
        tone: "info",
      });
    }

    return insights.slice(0, 4);
  }

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
