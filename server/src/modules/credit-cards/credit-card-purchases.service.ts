import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import { CardPurchaseSource, CategoryType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CategoriesService } from "../categories/categories.service";
import {
  CreditCardPurchaseNotFoundException,
  CreditCardPurchaseReadOnlyException,
} from "../../common/exceptions/app.exception";
import { addMonthsToDateOnly, parseDateOnly } from "../../common/utils/date-only";
import { recalculateCardAvailableLimit } from "./credit-card-limit.util";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";
import type { CreditCard } from "@prisma/client";
import type { CreateCreditCardPurchaseDto } from "./dto/create-credit-card-purchase.dto";
import type { UpdateCreditCardPurchaseDto } from "./dto/update-credit-card-purchase.dto";
import type { ListCreditCardPurchasesQueryDto } from "./dto/list-credit-card-purchases-query.dto";
import type { RemovePurchaseScope } from "./dto/remove-purchase-query.dto";

const PURCHASE_INCLUDE = { category: true } as const;

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

    const totalInstallments = dto.totalInstallments ?? 1;
    if (totalInstallments > 1) {
      return this.createInstallments(userId, card, dto, totalInstallments);
    }

    const purchaseDate = parseDateOnly(dto.purchaseDate);
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
          notes: dto.notes,
          source: CardPurchaseSource.MANUAL,
        },
        include: PURCHASE_INCLUDE,
      });
      await this.recalculateInvoiceTotal(tx, invoice.id);
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
    if (dto.notes !== undefined) data.notes = dto.notes;

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
        await this.recalculateInvoiceTotal(tx, invoiceId);
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
        await this.recalculateInvoiceTotal(tx, invoiceId);
      }
      await recalculateCardAvailableLimit(tx, existing.cardId);
    });
  }

  private async createInstallments(
    userId: string,
    card: CreditCard,
    dto: CreateCreditCardPurchaseDto,
    totalInstallments: number,
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
            notes: dto.notes,
            source: CardPurchaseSource.MANUAL,
            installmentGroupId,
            installmentNumber: index + 1,
            installmentTotal: totalInstallments,
          },
          include: PURCHASE_INCLUDE,
        });
        if (index === 0) firstPurchase = created;
      }

      for (const invoiceId of touchedInvoiceIds) {
        await this.recalculateInvoiceTotal(tx, invoiceId);
      }
      await recalculateCardAvailableLimit(tx, card.id);
      return firstPurchase as PurchaseWithRelations;
    });

    return this.toPublic(first);
  }

  private async recalculateInvoiceTotal(
    tx: Prisma.TransactionClient,
    invoiceId: string,
  ): Promise<void> {
    const agg = await tx.creditCardPurchase.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });
    await tx.creditCardInvoice.update({
      where: { id: invoiceId },
      data: { totalAmount: agg._sum.amount ?? 0 },
    });
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
