import { Injectable } from "@nestjs/common";
import {
  CreditCard,
  CreditCardInvoiceStatus,
  CreditCardSource,
  CreditCardStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  CreditCardArchivedException,
  CreditCardNotFoundException,
  CreditCardReadOnlyException,
} from "../../common/exceptions/app.exception";
import { recalculateCardAvailableLimit } from "./credit-card-limit.util";
import type { CreateCreditCardDto } from "./dto/create-credit-card.dto";
import type { UpdateCreditCardDto } from "./dto/update-credit-card.dto";

export type PublicCreditCard = Omit<CreditCard, "creditLimit" | "availableLimit"> & {
  creditLimit: number | null;
  availableLimit: number | null;
};

export interface CreditCardSummary {
  cardCount: number;
  totalLimit: number;
  totalAvailable: number;
  totalUsed: number;
  openInvoicesTotal: number;
}

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCreditCardDto): Promise<PublicCreditCard> {
    const card = await this.prisma.creditCard.create({
      data: {
        userId,
        name: dto.name,
        brand: dto.brand,
        lastFourDigits: dto.lastFourDigits,
        creditLimit: dto.creditLimit ?? null,
        availableLimit: dto.creditLimit ?? null,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        source: CreditCardSource.MANUAL,
        status: CreditCardStatus.ACTIVE,
      },
    });
    return this.toPublic(card);
  }

  async list(userId: string): Promise<PublicCreditCard[]> {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId, status: CreditCardStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
    });
    return cards.map((card) => this.toPublic(card));
  }

  async findOne(userId: string, id: string): Promise<PublicCreditCard> {
    return this.toPublic(await this.assertOwnership(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateCreditCardDto): Promise<PublicCreditCard> {
    const existing = await this.assertOwnership(userId, id);
    if (existing.source === CreditCardSource.OPEN_FINANCE) {
      throw new CreditCardReadOnlyException();
    }

    const data: Prisma.CreditCardUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.lastFourDigits !== undefined) data.lastFourDigits = dto.lastFourDigits;
    if (dto.closingDay !== undefined) data.closingDay = dto.closingDay;
    if (dto.dueDay !== undefined) data.dueDay = dto.dueDay;
    if (dto.creditLimit !== undefined) data.creditLimit = dto.creditLimit;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.creditCard.update({ where: { id }, data });
      await recalculateCardAvailableLimit(tx, id);
      return tx.creditCard.findUniqueOrThrow({ where: { id } });
    });

    return this.toPublic(updated);
  }

  /** Prefers archiving over deletion whenever the card has history (spec section 40): hard-deletes
   * only an empty card, otherwise flips it to ARCHIVED so invoices/purchases stay queryable. */
  async archiveOrDelete(userId: string, id: string): Promise<{ archived: boolean }> {
    await this.assertOwnership(userId, id);

    const [invoiceCount, purchaseCount] = await Promise.all([
      this.prisma.creditCardInvoice.count({ where: { cardId: id } }),
      this.prisma.creditCardPurchase.count({ where: { cardId: id } }),
    ]);

    if (invoiceCount === 0 && purchaseCount === 0) {
      await this.prisma.creditCard.delete({ where: { id } });
      return { archived: false };
    }

    await this.prisma.creditCard.update({
      where: { id },
      data: { status: CreditCardStatus.ARCHIVED },
    });
    return { archived: true };
  }

  async getSummary(userId: string): Promise<CreditCardSummary> {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId, status: CreditCardStatus.ACTIVE },
    });

    let totalLimit = 0;
    let totalAvailable = 0;
    for (const card of cards) {
      totalLimit += Number(card.creditLimit ?? 0);
      totalAvailable += Number(card.availableLimit ?? card.creditLimit ?? 0);
    }

    const openInvoicesAgg = await this.prisma.creditCardInvoice.aggregate({
      where: {
        userId,
        status: { not: CreditCardInvoiceStatus.PAID },
        card: { status: CreditCardStatus.ACTIVE },
      },
      _sum: { totalAmount: true },
    });

    return {
      cardCount: cards.length,
      totalLimit,
      totalAvailable,
      totalUsed: totalLimit - totalAvailable,
      openInvoicesTotal: Number(openInvoicesAgg._sum.totalAmount ?? 0),
    };
  }

  async assertOwnership(userId: string, id: string): Promise<CreditCard> {
    const card = await this.prisma.creditCard.findFirst({ where: { id, userId } });
    if (!card) {
      throw new CreditCardNotFoundException();
    }
    return card;
  }

  async assertOwnedActiveCard(userId: string, id: string): Promise<CreditCard> {
    const card = await this.assertOwnership(userId, id);
    if (card.status === CreditCardStatus.ARCHIVED) {
      throw new CreditCardArchivedException();
    }
    return card;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(card: CreditCard): PublicCreditCard {
    return {
      ...card,
      creditLimit: card.creditLimit !== null ? Number(card.creditLimit) : null,
      availableLimit: card.availableLimit !== null ? Number(card.availableLimit) : null,
    };
  }
}
