import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { OpenFinanceTransactionNotFoundException } from "../../../common/exceptions/app.exception";
import { parseDateOnly } from "../../../common/utils/date-only";
import { OpenFinanceAccountsService } from "./open-finance-accounts.service";
import type { ListTransactionsQueryDto } from "../dto/list-transactions-query.dto";
import type { UpdateTransactionDto } from "../dto/update-transaction.dto";

const TRANSACTION_INCLUDE = { category: true } as const;
type TransactionWithCategory = Prisma.BankTransactionGetPayload<{
  include: typeof TRANSACTION_INCLUDE;
}>;

export type PublicBankTransaction = Omit<TransactionWithCategory, "amount"> & { amount: number };

export interface TransactionListResult {
  items: PublicBankTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class OpenFinanceTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: OpenFinanceAccountsService,
  ) {}

  async listForAccount(
    userId: string,
    accountId: string,
    query: ListTransactionsQueryDto,
  ): Promise<TransactionListResult> {
    await this.accountsService.assertOwnership(userId, accountId);

    const where = this.buildWhere(accountId, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        include: TRANSACTION_INCLUDE,
        orderBy: { transactionDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return { items: items.map((item) => this.toPublic(item)), total, page, pageSize };
  }

  async findOne(userId: string, id: string): Promise<PublicBankTransaction> {
    const transaction = await this.findOwnedOrThrow(userId, id);
    return this.toPublic(transaction);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<PublicBankTransaction> {
    await this.findOwnedOrThrow(userId, id);

    const data: Prisma.BankTransactionUncheckedUpdateInput = {};
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.bankTransaction.update({
      where: { id },
      data,
      include: TRANSACTION_INCLUDE,
    });
    return this.toPublic(updated);
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<TransactionWithCategory> {
    const transaction = await this.prisma.bankTransaction.findFirst({
      where: { id, userId },
      include: TRANSACTION_INCLUDE,
    });
    if (!transaction) {
      throw new OpenFinanceTransactionNotFoundException();
    }
    return transaction;
  }

  private buildWhere(
    accountId: string,
    query: ListTransactionsQueryDto,
  ): Prisma.BankTransactionWhereInput {
    const where: Prisma.BankTransactionWhereInput = { accountId };

    if (query.from || query.to) {
      where.transactionDate = {
        ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
        ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
      };
    }
    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { merchantName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(transaction: TransactionWithCategory): PublicBankTransaction {
    return { ...transaction, amount: Number(transaction.amount) };
  }
}
