import { Injectable } from "@nestjs/common";
import { FinancialGoal, FinancialGoalStatus, GoalTransaction, GoalTransactionType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  FinanceAccountNotFoundException,
  GoalInsufficientBalanceException,
  GoalTransactionNotFoundException,
} from "../../common/exceptions/app.exception";
import { parseDateOnly } from "../../common/utils/date-only";
import type { CreateGoalTransactionDto } from "./dto/create-goal-transaction.dto";

export type PublicGoalTransaction = Omit<GoalTransaction, "amount"> & { amount: number };

@Injectable()
export class GoalTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.toPublic(created);
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
