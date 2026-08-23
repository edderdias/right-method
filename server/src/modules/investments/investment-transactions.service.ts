import { Injectable } from "@nestjs/common";
import {
  Investment,
  InvestmentTransaction,
  InvestmentTransactionSource,
  InvestmentTransactionType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  InvestmentInsufficientQuantityException,
  InvestmentTransactionNotFoundException,
} from "../../common/exceptions/app.exception";
import { parseDateOnly } from "../../common/utils/date-only";
import type { CreateInvestmentTransactionDto } from "./dto/create-investment-transaction.dto";

export type PublicInvestmentTransaction = Omit<
  InvestmentTransaction,
  "quantity" | "unitPrice" | "amount" | "fees" | "realizedGain"
> & {
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
  fees: number;
  realizedGain: number | null;
};

const BUY_LIKE = new Set<InvestmentTransactionType>([
  InvestmentTransactionType.BUY,
  InvestmentTransactionType.DEPOSIT,
]);
const SELL_LIKE = new Set<InvestmentTransactionType>([
  InvestmentTransactionType.SELL,
  InvestmentTransactionType.WITHDRAW,
]);

/** Prorates the cost basis being liquidated by a sell/withdrawal. Quantity-tracked positions
 * (ações, FIIs, cripto...) prorate by units sold, since that unambiguously identifies what
 * fraction of the position left. Positions with no unit quantity (renda fixa, poupança — where
 * `quantity` stays 0) have no such basis, so they prorate by the withdrawal amount as a fraction
 * of the position's total current value instead — otherwise the "currentQuantity > 0" guard would
 * short-circuit to a zero cost basis and count the entire withdrawal as realized gain. */
function computeProportionalCostBasis(
  currentQuantity: number,
  investedAmount: number,
  currentValue: number,
  soldQuantity: number | null,
  amount: number,
): number {
  if (currentQuantity > 0) {
    const quantity = soldQuantity ?? currentQuantity;
    return investedAmount * (quantity / currentQuantity);
  }
  return currentValue > 0 ? investedAmount * (amount / currentValue) : 0;
}

@Injectable()
export class InvestmentTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    investment: Investment,
    dto: CreateInvestmentTransactionDto,
  ): Promise<PublicInvestmentTransaction> {
    const transactionDate = parseDateOnly(dto.transactionDate);
    const quantity = dto.quantity ?? null;
    const fees = dto.fees ?? 0;

    if (SELL_LIKE.has(dto.type)) {
      const currentQuantity = Number(investment.quantity);
      if (currentQuantity > 0) {
        const sellQuantity = quantity ?? currentQuantity;
        if (sellQuantity > currentQuantity) {
          throw new InvestmentInsufficientQuantityException();
        }
      } else if (dto.amount > Number(investment.currentValue)) {
        // Untracked-quantity position (e.g. renda fixa): the withdrawal amount itself is the
        // resource being depleted, so it can't exceed the position's current value.
        throw new InvestmentInsufficientQuantityException();
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.investmentTransaction.create({
        data: {
          userId,
          investmentId: investment.id,
          type: dto.type,
          quantity,
          unitPrice: dto.unitPrice ?? null,
          amount: dto.amount,
          fees,
          transactionDate,
          notes: dto.notes,
          source: InvestmentTransactionSource.MANUAL,
        },
      });

      await this.applyToInvestment(tx, investment, dto.type, quantity, dto.amount);

      if (SELL_LIKE.has(dto.type)) {
        const realizedGain = this.computeRealizedGain(investment, quantity, dto.amount);
        await tx.investmentTransaction.update({
          where: { id: transaction.id },
          data: { realizedGain },
        });
        return { ...transaction, realizedGain: new Prisma.Decimal(realizedGain) };
      }

      return transaction;
    });

    return this.toPublic(created);
  }

  async list(userId: string, investmentId: string): Promise<PublicInvestmentTransaction[]> {
    const transactions = await this.prisma.investmentTransaction.findMany({
      where: { userId, investmentId },
      orderBy: { transactionDate: "desc" },
    });
    return transactions.map((transaction) => this.toPublic(transaction));
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.findOwnedOrThrow(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.investmentTransaction.delete({ where: { id } });
      await this.recalculateInvestmentFromTransactions(tx, existing.investmentId);
    });
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<InvestmentTransaction> {
    const transaction = await this.prisma.investmentTransaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) {
      throw new InvestmentTransactionNotFoundException();
    }
    return transaction;
  }

  /** BUY/DEPOSIT increase quantity and cost basis; SELL/WITHDRAW decrease them proportionally.
   * DIVIDEND/INTEREST are recorded for future Open-Finance feed parity but manual entry for those
   * goes through InvestmentIncomesService instead, so they never reach this method in practice. */
  private async applyToInvestment(
    tx: Prisma.TransactionClient,
    investment: Investment,
    type: InvestmentTransactionType,
    quantity: number | null,
    amount: number,
  ): Promise<void> {
    const currentQuantity = Number(investment.quantity);
    const currentInvestedAmount = Number(investment.investedAmount);
    const currentAveragePrice = investment.averagePrice !== null ? Number(investment.averagePrice) : null;
    const hasLiveMark = investment.currentPrice !== null;

    if (BUY_LIKE.has(type)) {
      const txQuantity = quantity ?? 0;
      const newQuantity = currentQuantity + txQuantity;
      const newInvestedAmount = currentInvestedAmount + amount;
      // averagePrice is derived as total cost / total quantity — equivalent to a quantity-weighted
      // average of each purchase's unit price, and correct even when a purchase only supplies
      // `amount` (no explicit unitPrice), e.g. renda-fixa contributions.
      const newAveragePrice = newQuantity > 0 ? newInvestedAmount / newQuantity : currentAveragePrice;

      await tx.investment.update({
        where: { id: investment.id },
        data: {
          quantity: newQuantity,
          averagePrice: txQuantity > 0 ? newAveragePrice : currentAveragePrice,
          investedAmount: newInvestedAmount,
          // No live price feed yet: currentValue tracks cost basis 1:1 until the user manually
          // marks the position to market via update().
          ...(hasLiveMark ? {} : { currentValue: newInvestedAmount }),
        },
      });
      return;
    }

    if (SELL_LIKE.has(type)) {
      const currentValue = Number(investment.currentValue);
      const proportionalCostBasis = computeProportionalCostBasis(
        currentQuantity,
        currentInvestedAmount,
        currentValue,
        quantity,
        amount,
      );
      const newQuantity =
        currentQuantity > 0 ? Math.max(0, currentQuantity - (quantity ?? currentQuantity)) : 0;
      const newInvestedAmount = Math.max(0, currentInvestedAmount - proportionalCostBasis);
      const newCurrentValue = hasLiveMark
        ? currentValue
        : Math.max(0, currentValue - proportionalCostBasis);

      await tx.investment.update({
        where: { id: investment.id },
        data: {
          quantity: newQuantity,
          investedAmount: newInvestedAmount,
          currentValue: newCurrentValue,
        },
      });
    }
  }

  private computeRealizedGain(
    investment: Investment,
    quantity: number | null,
    amount: number,
  ): number {
    const currentQuantity = Number(investment.quantity);
    const currentInvestedAmount = Number(investment.investedAmount);
    const currentValue = Number(investment.currentValue);
    const proportionalCostBasis = computeProportionalCostBasis(
      currentQuantity,
      currentInvestedAmount,
      currentValue,
      quantity,
      amount,
    );
    return amount - proportionalCostBasis;
  }

  /** Rebuilds quantity/averagePrice/investedAmount from scratch by replaying the remaining
   * transactions in date order — simpler and less error-prone than inverting the incremental math
   * when a transaction is deleted. */
  private async recalculateInvestmentFromTransactions(
    tx: Prisma.TransactionClient,
    investmentId: string,
  ): Promise<void> {
    const investment = await tx.investment.findUniqueOrThrow({ where: { id: investmentId } });
    const transactions = await tx.investmentTransaction.findMany({
      where: { investmentId },
      orderBy: { transactionDate: "asc" },
    });

    let quantity = 0;
    let averagePrice: number | null = null;
    let investedAmount = 0;

    for (const transaction of transactions) {
      const txQuantity = transaction.quantity !== null ? Number(transaction.quantity) : null;
      const amount = Number(transaction.amount);

      if (BUY_LIKE.has(transaction.type)) {
        const qty = txQuantity ?? 0;
        const newQuantity = quantity + qty;
        const newInvestedAmount = investedAmount + amount;
        averagePrice = newQuantity > 0 ? newInvestedAmount / newQuantity : averagePrice;
        quantity = newQuantity;
        investedAmount = newInvestedAmount;
      } else if (SELL_LIKE.has(transaction.type)) {
        // During replay there is no separate historical currentValue to prorate against, so
        // investedAmount doubles as its own value proxy — consistent with the no-live-mark
        // default where currentValue tracks investedAmount 1:1 (see computeProportionalCostBasis).
        const proportionalCostBasis = computeProportionalCostBasis(
          quantity,
          investedAmount,
          investedAmount,
          txQuantity,
          amount,
        );
        quantity = quantity > 0 ? Math.max(0, quantity - (txQuantity ?? quantity)) : 0;
        investedAmount = Math.max(0, investedAmount - proportionalCostBasis);
      }
    }

    const hasLiveMark = investment.currentPrice !== null;
    await tx.investment.update({
      where: { id: investmentId },
      data: {
        quantity,
        averagePrice,
        investedAmount,
        ...(hasLiveMark ? {} : { currentValue: investedAmount }),
      },
    });
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(transaction: InvestmentTransaction): PublicInvestmentTransaction {
    return {
      ...transaction,
      quantity: transaction.quantity !== null ? Number(transaction.quantity) : null,
      unitPrice: transaction.unitPrice !== null ? Number(transaction.unitPrice) : null,
      amount: Number(transaction.amount),
      fees: Number(transaction.fees),
      realizedGain: transaction.realizedGain !== null ? Number(transaction.realizedGain) : null,
    };
  }
}
