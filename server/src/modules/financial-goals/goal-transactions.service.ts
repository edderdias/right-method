import { Injectable } from "@nestjs/common";
import { FinancialGoal, FinancialGoalStatus, GoalTransaction, GoalTransactionType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  FinanceAccountNotFoundException,
  GoalInsufficientBalanceException,
  GoalTransactionNotFoundException,
} from "../../common/exceptions/app.exception";
import { parseDateOnly } from "../../common/utils/date-only";
import { NotificationsService } from "../notifications/notifications.service";
import type { CreateGoalTransactionDto } from "./dto/create-goal-transaction.dto";

const MILESTONES = [25, 50, 75, 100];

export type PublicGoalTransaction = Omit<GoalTransaction, "amount"> & { amount: number };

@Injectable()
export class GoalTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    userId: string,
    goal: FinancialGoal,
    dto: CreateGoalTransactionDto,
  ): Promise<PublicGoalTransaction> {
    if (dto.sourceAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.sourceAccountId, userId },
      });
      if (!account) {
        throw new FinanceAccountNotFoundException();
      }
    }

    const currentAmount = Number(goal.currentAmount);
    if (dto.type === GoalTransactionType.WITHDRAW && dto.amount > currentAmount) {
      throw new GoalInsufficientBalanceException(currentAmount);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.goalTransaction.create({
        data: {
          userId,
          goalId: goal.id,
          type: dto.type,
          amount: dto.amount,
          transactionDate: parseDateOnly(dto.transactionDate),
          sourceAccountId: dto.sourceAccountId,
          description: dto.description,
        },
      });

      const delta = dto.type === GoalTransactionType.DEPOSIT ? dto.amount : -dto.amount;
      await this.applyDeltaAndSyncStatus(tx, goal, delta);

      return transaction;
    });

    await this.notifyMilestoneIfCrossed(userId, goal, currentAmount, dto.type, dto.amount);

    return this.toPublic(created);
  }

  /** Fires once per (goal, milestone%) crossing — a withdrawal that later gets re-deposited and
   * re-crosses the same milestone is allowed to notify again, guarded by the entityId uniqueness
   * on Notification rather than any state kept here. */
  private async notifyMilestoneIfCrossed(
    userId: string,
    goal: FinancialGoal,
    amountBefore: number,
    type: GoalTransactionType,
    amount: number,
  ): Promise<void> {
    const targetAmount = Number(goal.targetAmount);
    if (targetAmount <= 0) return;

    const delta = type === GoalTransactionType.DEPOSIT ? amount : -amount;
    const amountAfter = Math.max(amountBefore + delta, 0);
    const oldPct = (amountBefore / targetAmount) * 100;
    const newPct = (amountAfter / targetAmount) * 100;
    const crossed = MILESTONES.find((milestone) => oldPct < milestone && newPct >= milestone);
    if (!crossed) return;

    await this.notifications.create({
      userId,
      type: "GOAL_MILESTONE",
      title: crossed >= 100 ? "Meta concluída!" : `${crossed}% da meta atingido`,
      body:
        crossed >= 100
          ? `Você concluiu a meta "${goal.name}".`
          : `Você já alcançou ${crossed}% da meta "${goal.name}".`,
      link: "/metas",
      entityId: `${goal.id}:${crossed}`,
    });
  }

  async list(userId: string, goalId: string): Promise<PublicGoalTransaction[]> {
    const transactions = await this.prisma.goalTransaction.findMany({
      where: { userId, goalId },
      orderBy: { transactionDate: "desc" },
    });
    return transactions.map((transaction) => this.toPublic(transaction));
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.findOwnedOrThrow(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.goalTransaction.delete({ where: { id } });

      const goal = await tx.financialGoal.findUniqueOrThrow({ where: { id: existing.goalId } });
      const delta = existing.type === GoalTransactionType.DEPOSIT ? -Number(existing.amount) : Number(existing.amount);
      await this.applyDeltaAndSyncStatus(tx, goal, delta);
    });
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<GoalTransaction> {
    const transaction = await this.prisma.goalTransaction.findFirst({ where: { id, userId } });
    if (!transaction) {
      throw new GoalTransactionNotFoundException();
    }
    return transaction;
  }

  /** Applies a currentAmount delta and flips ACTIVE<->COMPLETED as it crosses targetAmount. Only
   * touches those two statuses — a PAUSED or ARCHIVED goal keeps its status even if a contribution
   * (e.g. a backdated entry) pushes it past the target. */
  private async applyDeltaAndSyncStatus(
    tx: Prisma.TransactionClient,
    goal: FinancialGoal,
    delta: number,
  ): Promise<void> {
    const newCurrentAmount = Math.max(Number(goal.currentAmount) + delta, 0);
    const targetAmount = Number(goal.targetAmount);
    const reachedTarget = targetAmount > 0 && newCurrentAmount >= targetAmount;

    let status: FinancialGoalStatus | undefined;
    if (goal.status === FinancialGoalStatus.ACTIVE && reachedTarget) {
      status = FinancialGoalStatus.COMPLETED;
    } else if (goal.status === FinancialGoalStatus.COMPLETED && !reachedTarget) {
      status = FinancialGoalStatus.ACTIVE;
    }

    await tx.financialGoal.update({
      where: { id: goal.id },
      data: { currentAmount: newCurrentAmount, ...(status ? { status } : {}) },
    });
  }

  private toPublic(transaction: GoalTransaction): PublicGoalTransaction {
    return { ...transaction, amount: Number(transaction.amount) };
  }
}
