import { Injectable } from "@nestjs/common";
import type { Account, AccountTransfer } from "@prisma/client";
import { ExpenseStatus, Prisma, RevenueStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  AccountInUseException,
  AccountTransferNotFoundException,
  FinanceAccountNotFoundException,
  InvalidAccountTransferException,
} from "../../common/exceptions/app.exception";
import { formatDateOnly, parseDateOnly, startOfTodaySaoPaulo } from "../../common/utils/date-only";
import type { CreateAccountDto } from "./dto/create-account.dto";
import type { UpdateAccountDto } from "./dto/update-account.dto";
import type { TransferDto } from "./dto/transfer.dto";

export type PublicAccount = Omit<Account, "balance"> & { balance: number };

export interface PublicAccountTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromAccountName: string;
  toAccountName: string;
  amount: number;
  transferDate: string;
  description: string | null;
  createdAt: Date;
}

export interface TransferResult {
  transfer: PublicAccountTransfer;
  insufficientFunds: boolean;
}

export interface AccountPeriodSummaryItem {
  id: string;
  name: string;
  balance: number;
  received: number;
  spent: number;
}

export interface AccountsPeriodSummary {
  period: { from: string; to: string };
  accounts: AccountPeriodSummaryItem[];
  totals: { balance: number; received: number; spent: number };
}

export interface AccountsSummaryPeriodQuery {
  from?: string;
  to?: string;
  month?: number;
  year?: number;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<PublicAccount[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return accounts.map((account) => this.toPublic(account));
  }

  async create(userId: string, dto: CreateAccountDto): Promise<PublicAccount> {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        balance: dto.initialBalance ?? 0,
      },
    });
    return this.toPublic(account);
  }

  async update(userId: string, id: string, dto: UpdateAccountDto): Promise<PublicAccount> {
    await this.assertOwnership(userId, id);

    const data: Prisma.AccountUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.balance !== undefined) data.balance = dto.balance;

    const updated = await this.prisma.account.update({ where: { id }, data });
    return this.toPublic(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwnership(userId, id);

    const [revenueCount, expenseCount, transferCount, goalCount, goalTxCount] = await Promise.all([
      this.prisma.revenue.count({ where: { accountId: id } }),
      this.prisma.expense.count({ where: { accountId: id } }),
      this.prisma.accountTransfer.count({
        where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
      }),
      this.prisma.financialGoal.count({ where: { linkedAccountId: id } }),
      this.prisma.goalTransaction.count({ where: { sourceAccountId: id } }),
    ]);

    if (revenueCount + expenseCount + transferCount + goalCount + goalTxCount > 0) {
      throw new AccountInUseException();
    }

    await this.prisma.account.delete({ where: { id } });
  }

  async transfer(userId: string, dto: TransferDto): Promise<TransferResult> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new InvalidAccountTransferException("Escolha contas diferentes para a transferência.");
    }

    const [fromAccount] = await Promise.all([
      this.assertOwnership(userId, dto.fromAccountId),
      this.assertOwnership(userId, dto.toAccountId),
    ]);

    const insufficientFunds = Number(fromAccount.balance) < dto.amount;
    const transferDate = parseDateOnly(dto.transferDate);

    const transfer = await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: dto.fromAccountId },
        data: { balance: { decrement: dto.amount } },
      });
      await tx.account.update({
        where: { id: dto.toAccountId },
        data: { balance: { increment: dto.amount } },
      });
      return tx.accountTransfer.create({
        data: {
          userId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount: dto.amount,
          transferDate,
          description: dto.description,
        },
        include: { fromAccount: true, toAccount: true },
      });
    });

    return { transfer: this.transferToPublic(transfer), insufficientFunds };
  }

  async listTransfers(userId: string): Promise<PublicAccountTransfer[]> {
    const transfers = await this.prisma.accountTransfer.findMany({
      where: { userId },
      include: { fromAccount: true, toAccount: true },
      orderBy: [{ transferDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return transfers.map((transfer) => this.transferToPublic(transfer));
  }

  async removeTransfer(userId: string, id: string): Promise<void> {
    const transfer = await this.prisma.accountTransfer.findFirst({ where: { id, userId } });
    if (!transfer) {
      throw new AccountTransferNotFoundException();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: transfer.fromAccountId },
        data: { balance: { increment: transfer.amount } },
      });
      await tx.account.update({
        where: { id: transfer.toAccountId },
        data: { balance: { decrement: transfer.amount } },
      });
      await tx.accountTransfer.delete({ where: { id } });
    });
  }

  async getPeriodSummary(
    userId: string,
    query: AccountsSummaryPeriodQuery,
  ): Promise<AccountsPeriodSummary> {
    const period = this.resolvePeriod(query);

    const [accounts, receivedGroups, spentGroups] = await Promise.all([
      this.prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      this.prisma.revenue.groupBy({
        by: ["accountId"],
        where: {
          userId,
          status: RevenueStatus.RECEIVED,
          receivedAt: { gte: period.from, lte: period.to },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ["accountId"],
        where: {
          userId,
          status: ExpenseStatus.PAID,
          paidAt: { gte: period.from, lte: period.to },
        },
        _sum: { amount: true },
      }),
    ]);

    const receivedByAccount = new Map(
      receivedGroups.map((group) => [group.accountId, Number(group._sum.amount ?? 0)]),
    );
    const spentByAccount = new Map(
      spentGroups.map((group) => [group.accountId, Number(group._sum.amount ?? 0)]),
    );

    const items: AccountPeriodSummaryItem[] = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      balance: Number(account.balance),
      received: receivedByAccount.get(account.id) ?? 0,
      spent: spentByAccount.get(account.id) ?? 0,
    }));

    return {
      period: { from: formatDateOnly(period.from), to: formatDateOnly(period.to) },
      accounts: items,
      totals: {
        balance: items.reduce((sum, item) => sum + item.balance, 0),
        received: items.reduce((sum, item) => sum + item.received, 0),
        spent: items.reduce((sum, item) => sum + item.spent, 0),
      },
    };
  }

  async assertOwnership(userId: string, accountId: string): Promise<Account> {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) {
      throw new FinanceAccountNotFoundException();
    }
    return account;
  }

  private resolvePeriod(query: AccountsSummaryPeriodQuery): { from: Date; to: Date } {
    if (query.from && query.to) {
      return { from: parseDateOnly(query.from), to: parseDateOnly(query.to) };
    }
    if (query.month && query.year) {
      return {
        from: new Date(Date.UTC(query.year, query.month - 1, 1)),
        to: new Date(Date.UTC(query.year, query.month, 0)),
      };
    }
    const today = startOfTodaySaoPaulo();
    return {
      from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
      to: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)),
    };
  }

  private transferToPublic(
    transfer: AccountTransfer & { fromAccount: Account; toAccount: Account },
  ): PublicAccountTransfer {
    return {
      id: transfer.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      fromAccountName: transfer.fromAccount.name,
      toAccountName: transfer.toAccount.name,
      amount: Number(transfer.amount),
      transferDate: formatDateOnly(transfer.transferDate),
      description: transfer.description,
      createdAt: transfer.createdAt,
    };
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(account: Account): PublicAccount {
    return { ...account, balance: Number(account.balance) };
  }
}
