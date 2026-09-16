import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import { CardPurchaseSource, CardPurchaseType, CategoryType, CreditCardStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CategoriesService } from "../categories/categories.service";
import {
  CreditCardPurchaseNotFoundException,
  CreditCardPurchaseReadOnlyException,
  InvalidCreditCardPurchaseConfigException,
} from "../../common/exceptions/app.exception";
import { addMonthsToDateOnly, parseDateOnly } from "../../common/utils/date-only";
import { recalculateCardAvailableLimit, recalculateInvoiceTotal } from "./credit-card-limit.util";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";
import type { CreditCard } from "@prisma/client";
import type { CreateCreditCardPurchaseDto } from "./dto/create-credit-card-purchase.dto";
import type { UpdateCreditCardPurchaseDto } from "./dto/update-credit-card-purchase.dto";
import type { ListCreditCardPurchasesQueryDto } from "./dto/list-credit-card-purchases-query.dto";
import type { RemovePurchaseScope } from "./dto/remove-purchase-query.dto";

const PURCHASE_INCLUDE = { category: true } as const;

/** Trims the free-text responsible name; empty/blank becomes null so "no responsible" is a single
 * consistent value in the DB and in the per-responsible breakdown. */
function normalizeResponsibleName(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type PurchaseWithRelations = Prisma.CreditCardPurchaseGetPayload<{
  include: typeof PURCHASE_INCLUDE;
}>;

export type PublicPurchase = Omit<PurchaseWithRelations, "amount"> & { amount: number };

export interface PurchaseListResult {
  items: PublicPurchase[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ResponsibleSummaryItem {
  responsibleName: string | null;
  total: number;
  count: number;
}

export interface ResponsiblesSummaryFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  invoiceId?: string;
}

@Injectable()
export class CreditCardPurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly invoicesService: CreditCardInvoicesService,
  ) {}

  async create(
    userId: string,
    card: CreditCard,
    dto: CreateCreditCardPurchaseDto,
  ): Promise<PublicPurchase> {
    if (dto.categoryId) {
      await this.categoriesService.assertOwnershipOrGlobal(
        userId,
        dto.categoryId,
        CategoryType.EXPENSE,
      );
    }

    const type = dto.type ?? CardPurchaseType.PURCHASE;
    const totalInstallments = dto.totalInstallments ?? 1;
    const isRecurring = dto.isRecurring ?? false;
    if (isRecurring && totalInstallments > 1) {
      throw new InvalidCreditCardPurchaseConfigException(
        "Uma compra não pode ser recorrente e parcelada ao mesmo tempo.",
      );
    }
    if (type === CardPurchaseType.CREDIT && isRecurring) {
      throw new InvalidCreditCardPurchaseConfigException("Um crédito não pode ser recorrente.");
    }
    if (totalInstallments > 1) {
      return this.createInstallments(userId, card, dto, totalInstallments, type);
    }

    const purchaseDate = parseDateOnly(dto.purchaseDate);
    const recurrenceEndDate = dto.recurrenceEndDate ? parseDateOnly(dto.recurrenceEndDate) : null;
    if (isRecurring && recurrenceEndDate && recurrenceEndDate <= purchaseDate) {
      throw new InvalidCreditCardPurchaseConfigException(
        "A data de término da recorrência deve ser posterior à data da compra.",
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const invoice = await this.invoicesService.getOrCreateInvoice(tx, {
        userId,
        cardId: card.id,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        purchaseDate,
      });
      const purchase = await tx.creditCardPurchase.create({
        data: {
          userId,
          cardId: card.id,
          invoiceId: invoice.id,
          description: dto.description,
          amount: dto.amount,
          purchaseDate,
          categoryId: dto.categoryId,
          responsibleName: normalizeResponsibleName(dto.responsibleName),
          notes: dto.notes,
          source: CardPurchaseSource.MANUAL,
          type,
          isRecurring,
          recurrenceEndDate: isRecurring ? recurrenceEndDate : null,
        },
        include: PURCHASE_INCLUDE,
      });
      await recalculateInvoiceTotal(tx, invoice.id);
      await recalculateCardAvailableLimit(tx, card.id);
      return purchase;
    });

    return this.toPublic(created);
  }

  async list(
    userId: string,
    cardId: string,
    query: ListCreditCardPurchasesQueryDto,
  ): Promise<PurchaseListResult> {
    const where: Prisma.CreditCardPurchaseWhereInput = { userId, cardId };

    if (query.from || query.to) {
      where.purchaseDate = {
        ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
        ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
      };
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.responsibleName) where.responsibleName = query.responsibleName;
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { merchantName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.creditCardPurchase.findMany({
        where,
        include: PURCHASE_INCLUDE,
        orderBy: { purchaseDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.creditCardPurchase.count({ where }),
    ]);

    return { items: items.map((item) => this.toPublic(item)), total, page, pageSize };
  }

  async findOne(userId: string, id: string): Promise<PublicPurchase> {
    return this.toPublic(await this.findOwnedOrThrow(userId, id));
  }

  /** Total spend per responsible for a card, over the same filters the extrato uses. Purchases
   * with no responsible are grouped under a single `null` entry. Credits (estornos) net against
   * that responsible's purchases instead of inflating their total. Sorted by total, descending. */
  async responsiblesSummary(
    userId: string,
    cardId: string,
    filters: ResponsiblesSummaryFilters,
  ): Promise<ResponsibleSummaryItem[]> {
    const where: Prisma.CreditCardPurchaseWhereInput = { userId, cardId };

    if (filters.from || filters.to) {
      where.purchaseDate = {
        ...(filters.from ? { gte: parseDateOnly(filters.from) } : {}),
        ...(filters.to ? { lte: parseDateOnly(filters.to) } : {}),
      };
    }
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.invoiceId) where.invoiceId = filters.invoiceId;

    return this.netResponsiblesSummary(where);
  }

  /** Same breakdown as `responsiblesSummary`, but summed across every ACTIVE card the user owns —
   * feeds the "Gastos por responsável" card on the credit-cards dashboard. Archived cards are
   * excluded, matching `CreditCardsService.getSummary()`'s scope. */
  async responsiblesSummaryAllCards(userId: string): Promise<ResponsibleSummaryItem[]> {
    return this.netResponsiblesSummary({ userId, card: { status: CreditCardStatus.ACTIVE } });
  }

  /** Groups purchases by responsible (and type, to net credits/estornos against purchases) for
   * whatever card scope `where` describes, and returns totals sorted descending. */
  private async netResponsiblesSummary(
    where: Prisma.CreditCardPurchaseWhereInput,
  ): Promise<ResponsibleSummaryItem[]> {
    const grouped = await this.prisma.creditCardPurchase.groupBy({
      by: ["responsibleName", "type"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });

    const byResponsible = new Map<string | null, { total: number; count: number }>();
    for (const row of grouped) {
      const entry = byResponsible.get(row.responsibleName) ?? { total: 0, count: 0 };
      const amount = Number(row._sum.amount ?? 0);
      entry.total += row.type === CardPurchaseType.CREDIT ? -amount : amount;
      entry.count += row._count._all;
      byResponsible.set(row.responsibleName, entry);
    }

    return [...byResponsible.entries()]
      .map(([responsibleName, { total, count }]) => ({ responsibleName, total, count }))
      .sort((a, b) => b.total - a.total);
  }

  /** Distinct responsible names already used on this card — feeds the autocomplete in the
   * purchase form (merged client-side with the user's own name and family members). */
  async listResponsibleSuggestions(userId: string, cardId: string): Promise<string[]> {
    const rows = await this.prisma.creditCardPurchase.findMany({
      where: { userId, cardId, responsibleName: { not: null } },
      distinct: ["responsibleName"],
      select: { responsibleName: true },
      orderBy: { responsibleName: "asc" },
    });
    return rows.map((row) => row.responsibleName).filter((name): name is string => name !== null);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCreditCardPurchaseDto,
  ): Promise<PublicPurchase> {
    const existing = await this.findOwnedOrThrow(userId, id);
    if (
      existing.source === CardPurchaseSource.OPEN_FINANCE &&
      (dto.description !== undefined || dto.purchaseDate !== undefined)
    ) {
      throw new CreditCardPurchaseReadOnlyException();
    }
    if (dto.isRecurring === true) {
      if (existing.source === CardPurchaseSource.OPEN_FINANCE) {
        throw new CreditCardPurchaseReadOnlyException(
          "Compras importadas do Open Finance não podem virar compras recorrentes.",
        );
      }
      if (existing.installmentGroupId) {
        throw new InvalidCreditCardPurchaseConfigException(
          "Uma compra parcelada não pode virar uma compra recorrente.",
        );
      }
      if (existing.type === CardPurchaseType.CREDIT) {
        throw new InvalidCreditCardPurchaseConfigException("Um crédito não pode ser recorrente.");
      }
    }
    if (dto.categoryId) {
      await this.categoriesService.assertOwnershipOrGlobal(
        userId,
        dto.categoryId,
        CategoryType.EXPENSE,
      );
    }

    const data: Prisma.CreditCardPurchaseUncheckedUpdateInput = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.responsibleName !== undefined) {
      data.responsibleName = normalizeResponsibleName(dto.responsibleName);
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.isRecurring !== undefined) data.isRecurring = dto.isRecurring;
    if (dto.recurrenceEndDate !== undefined) {
      const recurrenceEndDate = dto.recurrenceEndDate ? parseDateOnly(dto.recurrenceEndDate) : null;
      const referenceDate = dto.purchaseDate
        ? parseDateOnly(dto.purchaseDate)
        : existing.purchaseDate;
      if (recurrenceEndDate && recurrenceEndDate <= referenceDate) {
        throw new InvalidCreditCardPurchaseConfigException(
          "A data de término da recorrência deve ser posterior à data da compra.",
        );
      }
      data.recurrenceEndDate = recurrenceEndDate;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const invoiceIdsToRecalc = new Set<string>([existing.invoiceId]);

      if (dto.purchaseDate !== undefined) {
        const card = await tx.creditCard.findUniqueOrThrow({ where: { id: existing.cardId } });
        const newDate = parseDateOnly(dto.purchaseDate);
        const invoice = await this.invoicesService.getOrCreateInvoice(tx, {
          userId,
          cardId: card.id,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          purchaseDate: newDate,
        });
        data.purchaseDate = newDate;
        data.invoiceId = invoice.id;
        invoiceIdsToRecalc.add(invoice.id);
      }

      const purchase = await tx.creditCardPurchase.update({
        where: { id },
        data,
        include: PURCHASE_INCLUDE,
      });
      for (const invoiceId of invoiceIdsToRecalc) {
        await recalculateInvoiceTotal(tx, invoiceId);
      }
      await recalculateCardAvailableLimit(tx, existing.cardId);
      return purchase;
    });

    return this.toPublic(updated);
  }

  async remove(userId: string, id: string, scope: RemovePurchaseScope): Promise<void> {
    const existing = await this.findOwnedOrThrow(userId, id);
    const purchases =
      scope === "group" && existing.installmentGroupId
        ? await this.prisma.creditCardPurchase.findMany({
            where: { userId, installmentGroupId: existing.installmentGroupId },
          })
        : [existing];

    const purchaseIds = purchases.map((purchase) => purchase.id);
    const invoiceIds = new Set(purchases.map((purchase) => purchase.invoiceId));

    await this.prisma.$transaction(async (tx) => {
      await tx.creditCardPurchase.deleteMany({ where: { id: { in: purchaseIds } } });
      for (const invoiceId of invoiceIds) {
        await recalculateInvoiceTotal(tx, invoiceId);
      }
      await recalculateCardAvailableLimit(tx, existing.cardId);
    });
  }

  private async createInstallments(
    userId: string,
    card: CreditCard,
    dto: CreateCreditCardPurchaseDto,
    totalInstallments: number,
    type: CardPurchaseType,
  ): Promise<PublicPurchase> {
    const totalCents = Math.round(dto.amount * 100);
    const baseCents = Math.floor(totalCents / totalInstallments);
    const remainderCents = totalCents - baseCents * totalInstallments;
    const purchaseDate = parseDateOnly(dto.purchaseDate);
    const installmentGroupId = randomUUID();

    const first = await this.prisma.$transaction(async (tx) => {
      let firstPurchase: PurchaseWithRelations | null = null;
      const touchedInvoiceIds = new Set<string>();

      for (let index = 0; index < totalInstallments; index += 1) {
        const isLast = index === totalInstallments - 1;
        const cents = baseCents + (isLast ? remainderCents : 0);
        const installmentDate = addMonthsToDateOnly(purchaseDate, index);
        const invoice = await this.invoicesService.getOrCreateInvoice(tx, {
          userId,
          cardId: card.id,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          purchaseDate: installmentDate,
        });
        touchedInvoiceIds.add(invoice.id);

        const created = await tx.creditCardPurchase.create({
          data: {
            userId,
            cardId: card.id,
            invoiceId: invoice.id,
            description: dto.description,
            amount: cents / 100,
            purchaseDate: installmentDate,
            categoryId: dto.categoryId,
            responsibleName: normalizeResponsibleName(dto.responsibleName),
            notes: dto.notes,
            source: CardPurchaseSource.MANUAL,
            type,
            installmentGroupId,
            installmentNumber: index + 1,
            installmentTotal: totalInstallments,
          },
          include: PURCHASE_INCLUDE,
        });
        if (index === 0) firstPurchase = created;
      }

      for (const invoiceId of touchedInvoiceIds) {
        await recalculateInvoiceTotal(tx, invoiceId);
      }
      await recalculateCardAvailableLimit(tx, card.id);
      return firstPurchase as PurchaseWithRelations;
    });

    return this.toPublic(first);
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<PurchaseWithRelations> {
    const purchase = await this.prisma.creditCardPurchase.findFirst({
      where: { id, userId },
      include: PURCHASE_INCLUDE,
    });
    if (!purchase) {
      throw new CreditCardPurchaseNotFoundException();
    }
    return purchase;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(purchase: PurchaseWithRelations): PublicPurchase {
    return { ...purchase, amount: Number(purchase.amount) };
  }
}
