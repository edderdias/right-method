import { Injectable } from "@nestjs/common";
import { Prisma, RecurrenceType, Revenue, RevenueStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import { CategoriesService } from "../categories/categories.service";
import { RevenueNotFoundException } from "../../common/exceptions/app.exception";
import {
  addMonthsToDateOnly,
  addWeeksToDateOnly,
  addYearsToDateOnly,
  parseDateOnly,
  startOfTodaySaoPaulo,
} from "../../common/utils/date-only";
import type { CreateRevenueDto } from "./dto/create-revenue.dto";
import type { UpdateRevenueDto } from "./dto/update-revenue.dto";
import type { ListRevenuesQueryDto } from "./dto/list-revenues-query.dto";

const REVENUE_INCLUDE = { category: true, account: true } as const;

type RevenueWithRelations = Prisma.RevenueGetPayload<{ include: typeof REVENUE_INCLUDE }>;

export type PublicRevenue = Omit<RevenueWithRelations, "amount" | "account"> & {
  amount: number;
  account: Omit<RevenueWithRelations["account"], "balance"> & { balance: number };
};

export interface RevenueListResult {
  items: PublicRevenue[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class RevenuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(userId: string, dto: CreateRevenueDto): Promise<PublicRevenue> {
    await this.accountsService.assertOwnership(userId, dto.accountId);
    await this.categoriesService.assertOwnershipOrGlobal(userId, dto.categoryId);

    const status = dto.status ?? RevenueStatus.PENDING;
    const dueDate = parseDateOnly(dto.dueDate);
    const receivedAt =
      status === RevenueStatus.RECEIVED
        ? dto.receivedAt
          ? parseDateOnly(dto.receivedAt)
          : startOfTodaySaoPaulo()
        : null;
    const isRecurring = dto.isRecurring ?? false;
    const recurrenceType = isRecurring ? (dto.recurrenceType ?? null) : null;
    const recurrenceEndDate = dto.recurrenceEndDate ? parseDateOnly(dto.recurrenceEndDate) : null;

    const data: Prisma.RevenueUncheckedCreateInput = {
      userId,
      description: dto.description,
      amount: dto.amount,
      categoryId: dto.categoryId,
      accountId: dto.accountId,
      dueDate,
      receivedAt,
      status,
      notes: dto.notes,
      isRecurring,
      recurrenceType,
      recurrenceEndDate,
    };

    const revenue = await this.prisma.$transaction(async (tx) => {
      const created = await tx.revenue.create({ data, include: REVENUE_INCLUDE });
      if (status === RevenueStatus.RECEIVED) {
        await tx.account.update({
          where: { id: dto.accountId },
          data: { balance: { increment: dto.amount } },
        });
        if (isRecurring && recurrenceType) {
          await this.generateNextOccurrence(tx, created);
        }
      }
      return created;
    });

    return this.toPublic(revenue);
  }

  async list(userId: string, query: ListRevenuesQueryDto): Promise<RevenueListResult> {
    const where = this.buildWhere(userId, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.revenue.findMany({
        where,
        include: REVENUE_INCLUDE,
        orderBy: { dueDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.revenue.count({ where }),
    ]);

    return { items: items.map((item) => this.toPublic(item)), total, page, pageSize };
  }

  async findOne(userId: string, id: string): Promise<PublicRevenue> {
    const revenue = await this.findOwnedOrThrow(userId, id);
    return this.toPublic(revenue);
  }

  async update(userId: string, id: string, dto: UpdateRevenueDto): Promise<PublicRevenue> {
    const existing = await this.findOwnedOrThrow(userId, id);

    if (dto.accountId && dto.accountId !== existing.accountId) {
      await this.accountsService.assertOwnership(userId, dto.accountId);
    }
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      await this.categoriesService.assertOwnershipOrGlobal(userId, dto.categoryId);
    }

    const oldStatus = existing.status;
    const oldAmount = existing.amount;
    const oldAccountId = existing.accountId;

    const newStatus = dto.status ?? oldStatus;
    const newAccountId = dto.accountId ?? oldAccountId;
    const newAmountValue = dto.amount ?? Number(existing.amount);

    const data: Prisma.RevenueUncheckedUpdateInput = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.accountId !== undefined) data.accountId = dto.accountId;
    if (dto.dueDate !== undefined) data.dueDate = parseDateOnly(dto.dueDate);
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.isRecurring !== undefined) data.isRecurring = dto.isRecurring;
    if (dto.recurrenceType !== undefined) data.recurrenceType = dto.recurrenceType;
    if (dto.recurrenceEndDate !== undefined) {
      data.recurrenceEndDate = dto.recurrenceEndDate ? parseDateOnly(dto.recurrenceEndDate) : null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === RevenueStatus.RECEIVED && oldStatus !== RevenueStatus.RECEIVED) {
        data.receivedAt = dto.receivedAt ? parseDateOnly(dto.receivedAt) : startOfTodaySaoPaulo();
      } else if (dto.status !== RevenueStatus.RECEIVED) {
        data.receivedAt = null;
      } else if (dto.receivedAt !== undefined) {
        data.receivedAt = parseDateOnly(dto.receivedAt);
      }
    } else if (dto.receivedAt !== undefined && oldStatus === RevenueStatus.RECEIVED) {
      data.receivedAt = parseDateOnly(dto.receivedAt);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.applyBalanceImpact(tx, {
        oldStatus,
        newStatus,
        oldAccountId,
        newAccountId,
        oldAmount,
        newAmount: newAmountValue,
      });

      const result = await tx.revenue.update({ where: { id }, data, include: REVENUE_INCLUDE });

      const becameReceived =
        oldStatus !== RevenueStatus.RECEIVED && newStatus === RevenueStatus.RECEIVED;
      if (becameReceived && result.isRecurring && result.recurrenceType) {
        await this.generateNextOccurrence(tx, result);
      }

      return result;
    });

    return this.toPublic(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.findOwnedOrThrow(userId, id);

    await this.prisma.$transaction(async (tx) => {
      if (existing.status === RevenueStatus.RECEIVED) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: existing.amount } },
        });
      }
      await tx.revenue.delete({ where: { id } });
    });
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<RevenueWithRelations> {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, userId },
      include: REVENUE_INCLUDE,
    });
    if (!revenue) {
      throw new RevenueNotFoundException();
    }
    return revenue;
  }

  private buildWhere(userId: string, query: ListRevenuesQueryDto): Prisma.RevenueWhereInput {
    const where: Prisma.RevenueWhereInput = { userId };
    let dueDate: Prisma.DateTimeFilter = {};

    if (query.from || query.to) {
      dueDate = {
        ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
        ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
      };
    } else if (query.month && query.year) {
      dueDate = {
        gte: new Date(Date.UTC(query.year, query.month - 1, 1)),
        lt: new Date(Date.UTC(query.year, query.month, 1)),
      };
    } else if (query.year) {
      dueDate = {
        gte: new Date(Date.UTC(query.year, 0, 1)),
        lt: new Date(Date.UTC(query.year + 1, 0, 1)),
      };
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.accountId) where.accountId = query.accountId;
    if (query.isRecurring !== undefined) where.isRecurring = query.isRecurring;

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      where.amount = {
        ...(query.minAmount !== undefined ? { gte: query.minAmount } : {}),
        ...(query.maxAmount !== undefined ? { lte: query.maxAmount } : {}),
      };
    }

    if (query.status === "OVERDUE") {
      where.status = RevenueStatus.PENDING;
      dueDate = { ...dueDate, lt: startOfTodaySaoPaulo() };
    } else if (query.status === "PENDING") {
      where.status = RevenueStatus.PENDING;
      dueDate = { ...dueDate, gte: startOfTodaySaoPaulo() };
    } else if (query.status === "RECEIVED") {
      where.status = RevenueStatus.RECEIVED;
    }

    if (Object.keys(dueDate).length > 0) {
      where.dueDate = dueDate;
    }

    return where;
  }

  private async applyBalanceImpact(
    tx: Prisma.TransactionClient,
    params: {
      oldStatus: RevenueStatus;
      newStatus: RevenueStatus;
      oldAccountId: string;
      newAccountId: string;
      oldAmount: Prisma.Decimal;
      newAmount: number;
    },
  ): Promise<void> {
    const { oldStatus, newStatus, oldAccountId, newAccountId, oldAmount, newAmount } = params;
    const wasReceived = oldStatus === RevenueStatus.RECEIVED;
    const isReceived = newStatus === RevenueStatus.RECEIVED;

    if (!wasReceived && isReceived) {
      await tx.account.update({
        where: { id: newAccountId },
        data: { balance: { increment: newAmount } },
      });
      return;
    }

    if (wasReceived && !isReceived) {
      await tx.account.update({
        where: { id: oldAccountId },
        data: { balance: { decrement: oldAmount } },
      });
      return;
    }

    if (wasReceived && isReceived) {
      if (oldAccountId !== newAccountId) {
        await tx.account.update({
          where: { id: oldAccountId },
          data: { balance: { decrement: oldAmount } },
        });
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newAmount } },
        });
        return;
      }
      const delta = new Prisma.Decimal(newAmount).minus(oldAmount);
      if (!delta.isZero()) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: delta } },
        });
      }
    }
    // PENDING -> PENDING: nunca escreve saldo.
  }

  private async generateNextOccurrence(
    tx: Prisma.TransactionClient,
    revenue: Revenue,
  ): Promise<void> {
    if (!revenue.recurrenceType) return;

    const existingChild = await tx.revenue.findFirst({ where: { parentRevenueId: revenue.id } });
    if (existingChild) return;

    const nextDueDate = this.computeNextDueDate(revenue.dueDate, revenue.recurrenceType);
    if (revenue.recurrenceEndDate && nextDueDate > revenue.recurrenceEndDate) return;

    await tx.revenue.create({
      data: {
        userId: revenue.userId,
        description: revenue.description,
        amount: revenue.amount,
        categoryId: revenue.categoryId,
        accountId: revenue.accountId,
        dueDate: nextDueDate,
        status: RevenueStatus.PENDING,
        isRecurring: true,
        recurrenceType: revenue.recurrenceType,
        recurrenceEndDate: revenue.recurrenceEndDate,
        parentRevenueId: revenue.id,
      },
    });
  }

  private computeNextDueDate(dueDate: Date, recurrenceType: RecurrenceType): Date {
    switch (recurrenceType) {
      case RecurrenceType.WEEKLY:
        return addWeeksToDateOnly(dueDate, 1);
      case RecurrenceType.BIWEEKLY:
        return addWeeksToDateOnly(dueDate, 2);
      case RecurrenceType.YEARLY:
        return addYearsToDateOnly(dueDate, 1);
      case RecurrenceType.MONTHLY:
      case RecurrenceType.CUSTOM:
      default:
        return addMonthsToDateOnly(dueDate, 1);
    }
  }

  private decorateStatus<T extends { status: RevenueStatus; dueDate: Date }>(revenue: T): T {
    if (revenue.status === RevenueStatus.PENDING && revenue.dueDate < startOfTodaySaoPaulo()) {
      return { ...revenue, status: RevenueStatus.OVERDUE };
    }
    return revenue;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(revenue: RevenueWithRelations): PublicRevenue {
    const decorated = this.decorateStatus(revenue);
    return {
      ...decorated,
      amount: Number(decorated.amount),
      account: { ...decorated.account, balance: Number(decorated.account.balance) },
    };
  }
}
