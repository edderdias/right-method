import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import { CategoryType, Expense, ExpenseStatus, Prisma, RecurrenceType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import { CategoriesService } from "../categories/categories.service";
import {
  ExpenseNotFoundException,
  InvalidExpenseConfigException,
} from "../../common/exceptions/app.exception";
import {
  addMonthsToDateOnly,
  addWeeksToDateOnly,
  addYearsToDateOnly,
  parseDateOnly,
  startOfTodaySaoPaulo,
} from "../../common/utils/date-only";
import type { CreateExpenseDto } from "./dto/create-expense.dto";
import type { UpdateExpenseDto } from "./dto/update-expense.dto";
import type { ListExpensesQueryDto } from "./dto/list-expenses-query.dto";

const EXPENSE_INCLUDE = { category: true, account: true } as const;

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

export type PublicExpense = Omit<ExpenseWithRelations, "amount" | "account"> & {
  amount: number;
  account: Omit<ExpenseWithRelations["account"], "balance"> & { balance: number };
};

export interface ExpenseListResult {
  items: PublicExpense[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<PublicExpense> {
    await this.accountsService.assertOwnership(userId, dto.accountId);
    await this.categoriesService.assertOwnershipOrGlobal(
      userId,
      dto.categoryId,
      CategoryType.EXPENSE,
    );

    const isRecurring = dto.isRecurring ?? false;
    const isInstallment = dto.isInstallment ?? false;

    if (isRecurring && isInstallment) {
      throw new InvalidExpenseConfigException(
        "Uma despesa não pode ser recorrente e parcelada ao mesmo tempo.",
      );
    }
    if (isInstallment && !dto.totalInstallments) {
      throw new InvalidExpenseConfigException("Informe a quantidade de parcelas.");
    }

    if (isInstallment) {
      return this.createInstallments(userId, dto);
    }

    const status = dto.status ?? ExpenseStatus.PENDING;
    const dueDate = parseDateOnly(dto.dueDate);
    const paidAt =
      status === ExpenseStatus.PAID
        ? dto.paidAt
          ? parseDateOnly(dto.paidAt)
          : startOfTodaySaoPaulo()
        : null;
    const recurrenceType = isRecurring ? (dto.recurrenceType ?? null) : null;
    const recurrenceEndDate = dto.recurrenceEndDate ? parseDateOnly(dto.recurrenceEndDate) : null;

    const data: Prisma.ExpenseUncheckedCreateInput = {
      userId,
      description: dto.description,
      amount: dto.amount,
      categoryId: dto.categoryId,
      accountId: dto.accountId,
      dueDate,
      paidAt,
      status,
      notes: dto.notes,
      isRecurring,
      recurrenceType,
      recurrenceEndDate,
      creditCardId: dto.creditCardId,
      attachmentUrl: dto.attachmentUrl,
    };

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({ data, include: EXPENSE_INCLUDE });
      if (status === ExpenseStatus.PAID) {
        await tx.account.update({
          where: { id: dto.accountId },
          data: { balance: { decrement: dto.amount } },
        });
        if (isRecurring && recurrenceType) {
          await this.generateNextOccurrence(tx, created);
        }
      }
      return created;
    });

    return this.toPublic(expense);
  }

  async list(userId: string, query: ListExpensesQueryDto): Promise<ExpenseListResult> {
    const where = this.buildWhere(userId, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: EXPENSE_INCLUDE,
        orderBy: { dueDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { items: items.map((item) => this.toPublic(item)), total, page, pageSize };
  }

  async findOne(userId: string, id: string): Promise<PublicExpense> {
    const expense = await this.findOwnedOrThrow(userId, id);
    return this.toPublic(expense);
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto): Promise<PublicExpense> {
    const existing = await this.findOwnedOrThrow(userId, id);

    if (dto.accountId && dto.accountId !== existing.accountId) {
      await this.accountsService.assertOwnership(userId, dto.accountId);
    }
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      await this.categoriesService.assertOwnershipOrGlobal(
        userId,
        dto.categoryId,
        CategoryType.EXPENSE,
      );
    }

    const oldStatus = existing.status;
    const oldAmount = existing.amount;
    const oldAccountId = existing.accountId;

    const newStatus = dto.status ?? oldStatus;
    const newAccountId = dto.accountId ?? oldAccountId;
    const newAmountValue = dto.amount ?? Number(existing.amount);

    const data: Prisma.ExpenseUncheckedUpdateInput = {};
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
    if (dto.creditCardId !== undefined) data.creditCardId = dto.creditCardId;
    if (dto.attachmentUrl !== undefined) data.attachmentUrl = dto.attachmentUrl;

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === ExpenseStatus.PAID && oldStatus !== ExpenseStatus.PAID) {
        data.paidAt = dto.paidAt ? parseDateOnly(dto.paidAt) : startOfTodaySaoPaulo();
      } else if (dto.status !== ExpenseStatus.PAID) {
        data.paidAt = null;
      } else if (dto.paidAt !== undefined) {
        data.paidAt = parseDateOnly(dto.paidAt);
      }
    } else if (dto.paidAt !== undefined && oldStatus === ExpenseStatus.PAID) {
      data.paidAt = parseDateOnly(dto.paidAt);
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

      const result = await tx.expense.update({ where: { id }, data, include: EXPENSE_INCLUDE });

      const becamePaid = oldStatus !== ExpenseStatus.PAID && newStatus === ExpenseStatus.PAID;
      if (becamePaid && result.isRecurring && result.recurrenceType) {
        await this.generateNextOccurrence(tx, result);
      }

      return result;
    });

    return this.toPublic(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.findOwnedOrThrow(userId, id);

    await this.prisma.$transaction(async (tx) => {
      if (existing.status === ExpenseStatus.PAID) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } },
        });
      }
      await tx.expense.delete({ where: { id } });
    });
  }

  private async createInstallments(userId: string, dto: CreateExpenseDto): Promise<PublicExpense> {
    const totalInstallments = dto.totalInstallments!;
    const totalCents = Math.round(dto.amount * 100);
    const baseCents = Math.floor(totalCents / totalInstallments);
    const remainderCents = totalCents - baseCents * totalInstallments;
    const dueDate = parseDateOnly(dto.dueDate);
    const installmentGroupId = randomUUID();

    const firstInstallment = await this.prisma.$transaction(async (tx) => {
      let first: ExpenseWithRelations | null = null;

      for (let index = 0; index < totalInstallments; index += 1) {
        const isLast = index === totalInstallments - 1;
        const cents = baseCents + (isLast ? remainderCents : 0);
        const created = await tx.expense.create({
          data: {
            userId,
            description: dto.description,
            amount: cents / 100,
            categoryId: dto.categoryId,
            accountId: dto.accountId,
            dueDate: addMonthsToDateOnly(dueDate, index),
            status: ExpenseStatus.PENDING,
            notes: dto.notes,
            isInstallment: true,
            installmentGroupId,
            installmentNumber: index + 1,
            installmentTotal: totalInstallments,
            creditCardId: dto.creditCardId,
            attachmentUrl: dto.attachmentUrl,
          },
          include: EXPENSE_INCLUDE,
        });
        if (index === 0) first = created;
      }

      return first as ExpenseWithRelations;
    });

    return this.toPublic(firstInstallment);
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<ExpenseWithRelations> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId },
      include: EXPENSE_INCLUDE,
    });
    if (!expense) {
      throw new ExpenseNotFoundException();
    }
    return expense;
  }

  private buildWhere(userId: string, query: ListExpensesQueryDto): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = { userId };
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
    if (query.installmentGroupId) where.installmentGroupId = query.installmentGroupId;

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      where.amount = {
        ...(query.minAmount !== undefined ? { gte: query.minAmount } : {}),
        ...(query.maxAmount !== undefined ? { lte: query.maxAmount } : {}),
      };
    }

    if (query.status === "OVERDUE") {
      where.status = ExpenseStatus.PENDING;
      dueDate = { ...dueDate, lt: startOfTodaySaoPaulo() };
    } else if (query.status === "PENDING") {
      where.status = ExpenseStatus.PENDING;
      dueDate = { ...dueDate, gte: startOfTodaySaoPaulo() };
    } else if (query.status === "PAID") {
      where.status = ExpenseStatus.PAID;
    }

    if (Object.keys(dueDate).length > 0) {
      where.dueDate = dueDate;
    }

    return where;
  }

  private async applyBalanceImpact(
    tx: Prisma.TransactionClient,
    params: {
      oldStatus: ExpenseStatus;
      newStatus: ExpenseStatus;
      oldAccountId: string;
      newAccountId: string;
      oldAmount: Prisma.Decimal;
      newAmount: number;
    },
  ): Promise<void> {
    const { oldStatus, newStatus, oldAccountId, newAccountId, oldAmount, newAmount } = params;
    const wasPaid = oldStatus === ExpenseStatus.PAID;
    const isPaid = newStatus === ExpenseStatus.PAID;

    if (!wasPaid && isPaid) {
      await tx.account.update({
        where: { id: newAccountId },
        data: { balance: { decrement: newAmount } },
      });
      return;
    }

    if (wasPaid && !isPaid) {
      await tx.account.update({
        where: { id: oldAccountId },
        data: { balance: { increment: oldAmount } },
      });
      return;
    }

    if (wasPaid && isPaid) {
      if (oldAccountId !== newAccountId) {
        await tx.account.update({
          where: { id: oldAccountId },
          data: { balance: { increment: oldAmount } },
        });
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } },
        });
        return;
      }
      const delta = new Prisma.Decimal(newAmount).minus(oldAmount);
      if (!delta.isZero()) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: delta } },
        });
      }
    }
    // PENDING -> PENDING: nunca escreve saldo.
  }

  private async generateNextOccurrence(
    tx: Prisma.TransactionClient,
    expense: Expense,
  ): Promise<void> {
    if (!expense.recurrenceType) return;

    const existingChild = await tx.expense.findFirst({ where: { parentExpenseId: expense.id } });
    if (existingChild) return;

    const nextDueDate = this.computeNextDueDate(expense.dueDate, expense.recurrenceType);
    if (expense.recurrenceEndDate && nextDueDate > expense.recurrenceEndDate) return;

    await tx.expense.create({
      data: {
        userId: expense.userId,
        description: expense.description,
        amount: expense.amount,
        categoryId: expense.categoryId,
        accountId: expense.accountId,
        dueDate: nextDueDate,
        status: ExpenseStatus.PENDING,
        isRecurring: true,
        recurrenceType: expense.recurrenceType,
        recurrenceEndDate: expense.recurrenceEndDate,
        parentExpenseId: expense.id,
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

  private decorateStatus<T extends { status: ExpenseStatus; dueDate: Date }>(expense: T): T {
    if (expense.status === ExpenseStatus.PENDING && expense.dueDate < startOfTodaySaoPaulo()) {
      return { ...expense, status: ExpenseStatus.OVERDUE };
    }
    return expense;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(expense: ExpenseWithRelations): PublicExpense {
    const decorated = this.decorateStatus(expense);
    return {
      ...decorated,
      amount: Number(decorated.amount),
      account: { ...decorated.account, balance: Number(decorated.account.balance) },
    };
  }
}
