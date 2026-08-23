import { Injectable, Logger } from "@nestjs/common";
import { ReportsService } from "../reports/reports.service";
import { FinancialGoalsService } from "../financial-goals/financial-goals.service";
import { InvestmentsService } from "../investments/investments.service";
import { CreditCardsService } from "../credit-cards/credit-cards.service";
import type { ReportsQueryDto } from "../reports/dto/reports-query.dto";
import type { FinancialGoalsSummary } from "../financial-goals/financial-goals.service";
import type { InvestmentSummary } from "../investments/investments.service";
import type { CreditCardSummary } from "../credit-cards/credit-cards.service";

export interface AiFinancialContext {
  generatedAt: string;
  currentMonth: {
    period: { from: string; to: string };
    income: number;
    expenses: number;
    balance: number;
    savingsRatePct: number;
  };
  previousMonth: {
    income: number;
    expenses: number;
    balance: number;
  };
  variationVsPreviousMonth: {
    incomePct: number | null;
    expensesPct: number | null;
    balancePct: number | null;
  };
  expensesByCategory: { name: string; total: number; percentage: number }[];
  topExpenses: { description: string; amount: number; paidAt: string; categoryName: string }[];
  goals: FinancialGoalsSummary | null;
  investments: InvestmentSummary | null;
  creditCards: CreditCardSummary | null;
}

/** Assembles the compact, real financial snapshot handed to the LLM — the only source of numbers
 * it is allowed to talk about. Every field is fetched through the same services that power the
 * rest of the app (Reports/Metas/Investimentos/Cartões), never mocked or recomputed here. */
@Injectable()
export class AiContextService {
  private readonly logger = new Logger(AiContextService.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly financialGoalsService: FinancialGoalsService,
    private readonly investmentsService: InvestmentsService,
    private readonly creditCardsService: CreditCardsService,
  ) {}

  async buildContext(userId: string): Promise<AiFinancialContext> {
    const period = this.reportsService.resolvePeriod({} as ReportsQueryDto);

    const [summary, expensesByCategory, topExpenses, goals, investments, creditCards] =
      await Promise.all([
        this.reportsService.getSummary(userId, period),
        this.reportsService.getExpensesByCategory(userId, period),
        this.reportsService.getTopExpenses(userId, period, 5),
        this.safely(() => this.financialGoalsService.getSummary(userId), "goals"),
        this.safely(() => this.investmentsService.getSummary(userId), "investments"),
        this.safely(() => this.creditCardsService.getSummary(userId), "creditCards"),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      currentMonth: {
        period: summary.current.period,
        income: summary.current.income,
        expenses: summary.current.expenses,
        balance: summary.current.balance,
        savingsRatePct: summary.current.savingsRatePct,
      },
      previousMonth: {
        income: summary.previous.income,
        expenses: summary.previous.expenses,
        balance: summary.previous.balance,
      },
      variationVsPreviousMonth: summary.variation,
      expensesByCategory: expensesByCategory.map((c) => ({
        name: c.name,
        total: c.total,
        percentage: c.percentage,
      })),
      topExpenses: topExpenses.map((e) => ({
        description: e.description,
        amount: e.amount,
        paidAt: e.paidAt,
        categoryName: e.categoryName,
      })),
      goals,
      investments,
      creditCards,
    };
  }

  /** A module being unavailable must never break the whole assistant — it just means the model
   * has to say "não tenho esse dado" instead of hallucinating a number. */
  private async safely<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logger.warn(`Falha ao montar contexto de IA (${label}): ${(error as Error).message}`);
      return null;
    }
  }
}
