import { Injectable } from "@nestjs/common";
import { FinancialGoal, FinancialGoalStatus, GoalTransactionType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  FinanceAccountNotFoundException,
  FinancialGoalArchivedException,
  FinancialGoalNotFoundException,
} from "../../common/exceptions/app.exception";
import { addMonthsToDateOnly, formatDateOnly, parseDateOnly, startOfTodaySaoPaulo } from "../../common/utils/date-only";
import type { CreateFinancialGoalDto } from "./dto/create-financial-goal.dto";
import type { UpdateFinancialGoalDto } from "./dto/update-financial-goal.dto";

export type PublicFinancialGoal = Omit<
  FinancialGoal,
  "targetAmount" | "initialAmount" | "currentAmount"
> & {
  targetAmount: number;
  initialAmount: number;
  currentAmount: number;
};

export interface GoalCardMetrics {
  progressPct: number;
  remainingAmount: number;
  exceededAmount: number;
  daysRemaining: number;
  isOverdue: boolean;
  monthlyRequiredAmount: number;
}

export interface GoalDetailMetrics extends GoalCardMetrics {
  weeklyRequiredAmount: number;
  dailyRequiredAmount: number;
  averageMonthlyContribution: number;
  projectedCompletionDate: string | null;
  paceStatus: "ahead" | "on_track" | "behind" | null;
}

export type FinancialGoalWithMetrics = PublicFinancialGoal & GoalCardMetrics;

export interface LinkedInvestmentSummary {
  id: string;
  investmentId: string;
  name: string;
  currentValue: number;
}

export type FinancialGoalDetail = PublicFinancialGoal &
  GoalDetailMetrics & { linkedInvestments: LinkedInvestmentSummary[] };

export interface FinancialGoalsSummary {
  activeCount: number;
  completedCount: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgressPct: number;
}

const ACTIVE_LIKE_STATUSES: FinancialGoalStatus[] = [
  FinancialGoalStatus.ACTIVE,
  FinancialGoalStatus.PAUSED,
  FinancialGoalStatus.COMPLETED,
];

@Injectable()
export class FinancialGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFinancialGoalDto): Promise<FinancialGoalWithMetrics> {
    if (dto.linkedAccountId) {
      await this.assertOwnedAccount(userId, dto.linkedAccountId);
    }

    const initialAmount = dto.initialAmount ?? 0;
    const goal = await this.prisma.financialGoal.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        priority: dto.priority ?? undefined,
        targetAmount: dto.targetAmount,
        initialAmount,
        currentAmount: initialAmount,
        startDate: parseDateOnly(dto.startDate),
        targetDate: parseDateOnly(dto.targetDate),
        linkedAccountId: dto.linkedAccountId,
        status: FinancialGoalStatus.ACTIVE,
      },
    });
    return this.withCardMetrics(goal);
  }

  async list(userId: string): Promise<FinancialGoalWithMetrics[]> {
    const goals = await this.prisma.financialGoal.findMany({
      where: { userId, status: { in: ACTIVE_LIKE_STATUSES } },
      orderBy: { createdAt: "desc" },
    });
    return goals.map((goal) => this.withCardMetrics(goal));
  }

  async getSummary(userId: string): Promise<FinancialGoalsSummary> {
    const goals = await this.prisma.financialGoal.findMany({
      where: { userId, status: { in: ACTIVE_LIKE_STATUSES } },
    });

    let totalTargetAmount = 0;
    let totalCurrentAmount = 0;
    let activeCount = 0;
    let completedCount = 0;

    for (const goal of goals) {
      totalTargetAmount += Number(goal.targetAmount);
      totalCurrentAmount += Number(goal.currentAmount);
      if (goal.status === FinancialGoalStatus.ACTIVE) activeCount += 1;
      if (goal.status === FinancialGoalStatus.COMPLETED) completedCount += 1;
    }

    return {
      activeCount,
      completedCount,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgressPct:
        totalTargetAmount > 0
          ? Math.min(Math.round((totalCurrentAmount / totalTargetAmount) * 100), 100)
          : 0,
    };
  }

  async findOne(userId: string, id: string): Promise<FinancialGoalDetail> {
    const goal = await this.assertOwnership(userId, id);

    const [transactions, links] = await Promise.all([
      this.prisma.goalTransaction.findMany({ where: { goalId: id } }),
      this.prisma.goalInvestmentLink.findMany({
        where: { goalId: id },
        include: { investment: { select: { id: true, name: true, currentValue: true } } },
      }),
    ]);

    return this.withDetailMetrics(goal, transactions, links);
  }

  async update(userId: string, id: string, dto: UpdateFinancialGoalDto): Promise<FinancialGoalWithMetrics> {
    await this.assertOwnership(userId, id);
    if (dto.linkedAccountId) {
      await this.assertOwnedAccount(userId, dto.linkedAccountId);
    }

    const data: Prisma.FinancialGoalUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.targetAmount !== undefined) data.targetAmount = dto.targetAmount;
    if (dto.initialAmount !== undefined) data.initialAmount = dto.initialAmount;
    if (dto.startDate !== undefined) data.startDate = parseDateOnly(dto.startDate);
    if (dto.targetDate !== undefined) data.targetDate = parseDateOnly(dto.targetDate);
    if (dto.linkedAccountId !== undefined) data.linkedAccountId = dto.linkedAccountId;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.financialGoal.update({ where: { id }, data });
    return this.withCardMetrics(updated);
  }

  /** Prefers archiving over deletion whenever the goal has contribution/withdrawal history: hard
   * deletes only an empty goal, otherwise flips it to ARCHIVED so the history stays queryable. */
  async archiveOrDelete(userId: string, id: string): Promise<{ archived: boolean }> {
    await this.assertOwnership(userId, id);

    const transactionCount = await this.prisma.goalTransaction.count({ where: { goalId: id } });

    if (transactionCount === 0) {
      await this.prisma.financialGoal.delete({ where: { id } });
      return { archived: false };
    }

    await this.prisma.financialGoal.update({
      where: { id },
      data: { status: FinancialGoalStatus.ARCHIVED },
    });
    return { archived: true };
  }

  async assertOwnership(userId: string, id: string): Promise<FinancialGoal> {
    const goal = await this.prisma.financialGoal.findFirst({ where: { id, userId } });
    if (!goal) {
      throw new FinancialGoalNotFoundException();
    }
    return goal;
  }

  async assertOwnedActiveGoal(userId: string, id: string): Promise<FinancialGoal> {
    const goal = await this.assertOwnership(userId, id);
    if (goal.status === FinancialGoalStatus.ARCHIVED) {
      throw new FinancialGoalArchivedException();
    }
    return goal;
  }

  private async assertOwnedAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) {
      throw new FinanceAccountNotFoundException();
    }
  }

  private withCardMetrics(goal: FinancialGoal): FinancialGoalWithMetrics {
    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);
    const metrics = computeCardMetrics(goal.status, targetAmount, currentAmount, goal.targetDate);
    return { ...this.toPublic(goal), ...metrics };
  }

  private withDetailMetrics(
    goal: FinancialGoal,
    transactions: { type: GoalTransactionType; amount: Prisma.Decimal; transactionDate: Date }[],
    links: { id: string; investmentId: string; investment: { id: string; name: string; currentValue: Prisma.Decimal } }[],
  ): FinancialGoalDetail {
    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);
    const cardMetrics = computeCardMetrics(goal.status, targetAmount, currentAmount, goal.targetDate);

    const averageMonthlyContribution = computeAverageMonthlyDeposit(transactions);
    const weeklyRequiredAmount = (cardMetrics.monthlyRequiredAmount * 12) / 52;
    const dailyRequiredAmount = (cardMetrics.monthlyRequiredAmount * 12) / 365;

    let projectedCompletionDate: string | null = null;
    let paceStatus: GoalDetailMetrics["paceStatus"] = null;

    if (cardMetrics.remainingAmount > 0) {
      if (averageMonthlyContribution > 0) {
        const monthsNeeded = Math.ceil(cardMetrics.remainingAmount / averageMonthlyContribution);
        projectedCompletionDate = formatDateOnly(addMonthsToDateOnly(startOfTodaySaoPaulo(), monthsNeeded));
      }

      if (averageMonthlyContribution >= cardMetrics.monthlyRequiredAmount * 1.05) {
        paceStatus = "ahead";
      } else if (averageMonthlyContribution <= cardMetrics.monthlyRequiredAmount * 0.95) {
        paceStatus = "behind";
      } else {
        paceStatus = "on_track";
      }
    }

    return {
      ...this.toPublic(goal),
      ...cardMetrics,
      weeklyRequiredAmount,
      dailyRequiredAmount,
      averageMonthlyContribution,
      projectedCompletionDate,
      paceStatus,
      linkedInvestments: links.map((link) => ({
        id: link.id,
        investmentId: link.investmentId,
        name: link.investment.name,
        currentValue: Number(link.investment.currentValue),
      })),
    };
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(goal: FinancialGoal): PublicFinancialGoal {
    return {
      ...goal,
      targetAmount: Number(goal.targetAmount),
      initialAmount: Number(goal.initialAmount),
      currentAmount: Number(goal.currentAmount),
    };
  }
}

function computeCardMetrics(
  status: FinancialGoalStatus,
  targetAmount: number,
  currentAmount: number,
  targetDate: Date,
): GoalCardMetrics {
  const progressPct = targetAmount > 0 ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100) : 0;
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const exceededAmount = Math.max(currentAmount - targetAmount, 0);

  const today = startOfTodaySaoPaulo();
  const daysRemaining = Math.round((targetDate.getTime() - today.getTime()) / 86_400_000);
  const isOverdue =
    daysRemaining < 0 &&
    status !== FinancialGoalStatus.COMPLETED &&
    status !== FinancialGoalStatus.ARCHIVED;

  const monthsRemaining = Math.max(monthsBetween(today, targetDate), 1);
  const monthlyRequiredAmount = remainingAmount / monthsRemaining;

  return { progressPct, remainingAmount, exceededAmount, daysRemaining, isOverdue, monthlyRequiredAmount };
}

function monthsBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(months, 0);
}

/** Averages DEPOSIT totals across the calendar months in which at least one deposit happened —
 * months with zero deposits don't drag the average down, since the goal may be brand new. */
function computeAverageMonthlyDeposit(
  transactions: { type: GoalTransactionType; amount: Prisma.Decimal; transactionDate: Date }[],
): number {
  const totalsByMonth = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== GoalTransactionType.DEPOSIT) continue;
    const key = transaction.transactionDate.toISOString().slice(0, 7);
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + Number(transaction.amount));
  }
  if (totalsByMonth.size === 0) return 0;
  const total = Array.from(totalsByMonth.values()).reduce((sum, value) => sum + value, 0);
  return total / totalsByMonth.size;
}
