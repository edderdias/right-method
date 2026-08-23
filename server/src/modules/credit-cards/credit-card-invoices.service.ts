import { Injectable } from "@nestjs/common";
import { CreditCardInvoice, CreditCardInvoiceStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import {
  CreditCardInvoiceAlreadyPaidException,
  CreditCardInvoiceNotFoundException,
} from "../../common/exceptions/app.exception";
import {
  addMonthsToDateOnly,
  parseDateOnly,
  startOfTodaySaoPaulo,
} from "../../common/utils/date-only";
import { recalculateCardAvailableLimit } from "./credit-card-limit.util";
import type { PayInvoiceDto } from "./dto/pay-invoice.dto";

export interface InvoiceCycle {
  referenceMonth: Date;
  closingDate: Date;
  dueDate: Date;
}

export type PublicInvoice = Omit<CreditCardInvoice, "totalAmount" | "paidAmount"> & {
  totalAmount: number;
  paidAmount: number;
};

const DEFAULT_CLOSING_DAY = 1;
const DEFAULT_DUE_DAY = 10;

@Injectable()
export class CreditCardInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  /** Given the card's closing/due day, decides which monthly invoice cycle a purchase date falls
   * into: on/before the closing day it's the current cycle, after it rolls to next month's
   * invoice (spec section 29). Falls back to sane defaults for Open Finance cards whose provider
   * hasn't reported a cycle yet. */
  resolveCycle(
    card: { closingDay: number | null; dueDay: number | null },
    purchaseDate: Date,
  ): InvoiceCycle {
    const closingDay = card.closingDay ?? DEFAULT_CLOSING_DAY;
    const dueDay = card.dueDay ?? DEFAULT_DUE_DAY;
    const day = purchaseDate.getUTCDate();

    let cycleMonth = new Date(
      Date.UTC(purchaseDate.getUTCFullYear(), purchaseDate.getUTCMonth(), 1),
    );
    if (day > closingDay) {
      cycleMonth = addMonthsToDateOnly(cycleMonth, 1);
    }

    const closingDate = new Date(
      Date.UTC(cycleMonth.getUTCFullYear(), cycleMonth.getUTCMonth(), closingDay),
    );
    let dueDate = new Date(Date.UTC(cycleMonth.getUTCFullYear(), cycleMonth.getUTCMonth(), dueDay));
    if (dueDay <= closingDay) {
      dueDate = addMonthsToDateOnly(dueDate, 1);
    }

    return { referenceMonth: cycleMonth, closingDate, dueDate };
  }

  /** Finds or creates the invoice a purchase belongs to. Must run inside the caller's transaction
   * so the invoice and its purchase are created atomically. */
  async getOrCreateInvoice(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      cardId: string;
      closingDay: number | null;
      dueDay: number | null;
      purchaseDate: Date;
    },
  ): Promise<CreditCardInvoice> {
    const cycle = this.resolveCycle(params, params.purchaseDate);
    return tx.creditCardInvoice.upsert({
      where: {
        cardId_referenceMonth: { cardId: params.cardId, referenceMonth: cycle.referenceMonth },
      },
      update: {},
      create: {
        userId: params.userId,
        cardId: params.cardId,
        referenceMonth: cycle.referenceMonth,
        closingDate: cycle.closingDate,
        dueDate: cycle.dueDate,
      },
    });
  }

  async list(userId: string, cardId: string): Promise<PublicInvoice[]> {
    const invoices = await this.prisma.creditCardInvoice.findMany({
      where: { userId, cardId },
      orderBy: { referenceMonth: "desc" },
    });
    return invoices.map((invoice) => this.toPublic(this.decorateStatus(invoice)));
  }

  async findOne(userId: string, id: string) {
    const invoice = await this.findOwnedOrThrow(userId, id);
    const purchases = await this.prisma.creditCardPurchase.findMany({
      where: { invoiceId: id },
      include: { category: true },
      orderBy: { purchaseDate: "asc" },
    });
    return {
      ...this.toPublic(this.decorateStatus(invoice)),
      purchases: purchases.map((purchase) => ({ ...purchase, amount: Number(purchase.amount) })),
    };
  }

  async pay(userId: string, invoiceId: string, dto: PayInvoiceDto): Promise<PublicInvoice> {
    const invoice = await this.findOwnedOrThrow(userId, invoiceId);
    if (invoice.status === CreditCardInvoiceStatus.PAID) {
      throw new CreditCardInvoiceAlreadyPaidException();
    }
    await this.accountsService.assertOwnership(userId, dto.accountId);
    const paidAt = dto.paidAt ? parseDateOnly(dto.paidAt) : startOfTodaySaoPaulo();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { decrement: invoice.totalAmount } },
      });
      const paid = await tx.creditCardInvoice.update({
        where: { id: invoiceId },
        data: {
          status: CreditCardInvoiceStatus.PAID,
          paidAmount: invoice.totalAmount,
          paidAt,
          paidFromAccountId: dto.accountId,
        },
      });
      await recalculateCardAvailableLimit(tx, invoice.cardId);
      return paid;
    });

    return this.toPublic(updated);
  }

  async findOwnedOrThrow(userId: string, id: string): Promise<CreditCardInvoice> {
    const invoice = await this.prisma.creditCardInvoice.findFirst({ where: { id, userId } });
    if (!invoice) {
      throw new CreditCardInvoiceNotFoundException();
    }
    return invoice;
  }

  private decorateStatus(invoice: CreditCardInvoice): CreditCardInvoice {
    if (invoice.status === CreditCardInvoiceStatus.PAID) return invoice;
    const today = startOfTodaySaoPaulo();
    if (today >= invoice.dueDate) {
      return { ...invoice, status: CreditCardInvoiceStatus.OVERDUE };
    }
    if (today >= invoice.closingDate) {
      return { ...invoice, status: CreditCardInvoiceStatus.CLOSED };
    }
    return { ...invoice, status: CreditCardInvoiceStatus.OPEN };
  }

  private toPublic(invoice: CreditCardInvoice): PublicInvoice {
    return {
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
    };
  }
}
