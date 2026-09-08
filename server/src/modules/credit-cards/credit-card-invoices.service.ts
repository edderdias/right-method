import { Injectable } from "@nestjs/common";
import {
  CategoryType,
  CreditCardInvoice,
  CreditCardInvoiceStatus,
  ExpenseStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import {
  CreditCardInvoiceAlreadyPaidException,
  CreditCardInvoiceNotFoundException,
  CreditCardInvoiceNotPaidException,
  CreditCardInvoiceReversalExpiredException,
} from "../../common/exceptions/app.exception";
import {
  addMonthsToDateOnly,
  formatDateOnly,
  parseDateOnly,
  startOfMonth,
  startOfTodaySaoPaulo,
} from "../../common/utils/date-only";
import { recalculateCardAvailableLimit } from "./credit-card-limit.util";
import type { PayInvoiceDto } from "./dto/pay-invoice.dto";
import type { ReverseInvoicePaymentDto } from "./dto/reverse-invoice-payment.dto";

export interface InvoiceCycle {
  referenceMonth: Date;
  closingDate: Date;
  dueDate: Date;
}

export type PublicInvoice = Omit<CreditCardInvoice, "totalAmount" | "paidAmount"> & {
  totalAmount: number;
  paidAmount: number;
  canReverse: boolean;
};

const DEFAULT_CLOSING_DAY = 1;
const DEFAULT_DUE_DAY = 10;
const CARD_EXPENSE_CATEGORY_NAME = "Cartão de crédito";

@Injectable()
export class CreditCardInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  /** Given the card's closing/due day, decides which monthly invoice cycle a purchase date falls
   * into: strictly before the closing day it's the current cycle; on or after the closing day it
   * rolls to next month's invoice (spec section 29) — e.g. closing day 4 sends a purchase dated the
   * 4th to next month's invoice, not the current one. Falls back to sane defaults for Open Finance
   * cards whose provider hasn't reported a cycle yet. */
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
    if (day >= closingDay) {
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

  /** Faturas do mês corrente em diante, mais qualquer fatura paga ainda dentro da janela de
   * estorno (para que o estorno continue acessível mesmo depois de virar "mês anterior"). */
  async list(userId: string, cardId: string): Promise<PublicInvoice[]> {
    const invoices = await this.prisma.creditCardInvoice.findMany({
      where: { userId, cardId },
      orderBy: { referenceMonth: "desc" },
    });
    const today = startOfTodaySaoPaulo();
    const currentMonthStart = startOfMonth(today);
    return invoices
      .filter(
        (invoice) =>
          invoice.referenceMonth >= currentMonthStart || this.canReversePayment(invoice, today),
      )
      .map((invoice) => this.toPublic(this.decorateStatus(invoice)));
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
    const card = await this.prisma.creditCard.findUniqueOrThrow({ where: { id: invoice.cardId } });
    const paidAt = dto.paidAt ? parseDateOnly(dto.paidAt) : startOfTodaySaoPaulo();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { decrement: invoice.totalAmount } },
      });

      // Book the invoice payment as a (already paid) expense so it shows up in Despesas and the
      // category reports. Created directly here so it does NOT re-debit the account — the debit
      // above already accounts for it.
      let paidExpenseId: string | null = null;
      if (Number(invoice.totalAmount) > 0) {
        const categoryId = await this.resolveCardExpenseCategoryId(tx, userId);
        const referenceLabel = formatDateOnly(invoice.referenceMonth).slice(0, 7);
        const expense = await tx.expense.create({
          data: {
            userId,
            description: `Fatura ${card.name} (${referenceLabel})`,
            amount: invoice.totalAmount,
            categoryId,
            accountId: dto.accountId,
            dueDate: invoice.dueDate,
            paidAt,
            status: ExpenseStatus.PAID,
            creditCardId: card.id,
          },
        });
        paidExpenseId = expense.id;
      }

      const paid = await tx.creditCardInvoice.update({
        where: { id: invoiceId },
        data: {
          status: CreditCardInvoiceStatus.PAID,
          paidAmount: invoice.totalAmount,
          paidAt,
          paidFromAccountId: dto.accountId,
          paidExpenseId,
        },
      });
      await recalculateCardAvailableLimit(tx, invoice.cardId);
      return paid;
    });

    return this.toPublic(updated);
  }

  /** Estorna o pagamento de uma fatura: devolve o valor à conta debitada, remove a despesa gerada
   * pelo pagamento e reabre a fatura. Só é permitido dentro da janela de estorno (spec: até a
   * fatura do mês seguinte fechar). */
  async reversePayment(
    userId: string,
    invoiceId: string,
    dto: ReverseInvoicePaymentDto,
  ): Promise<PublicInvoice> {
    const invoice = await this.findOwnedOrThrow(userId, invoiceId);
    if (invoice.status !== CreditCardInvoiceStatus.PAID) {
      throw new CreditCardInvoiceNotPaidException();
    }
    if (!this.canReversePayment(invoice, startOfTodaySaoPaulo())) {
      throw new CreditCardInvoiceReversalExpiredException();
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (invoice.paidFromAccountId) {
        await tx.account.update({
          where: { id: invoice.paidFromAccountId },
          data: { balance: { increment: invoice.paidAmount } },
        });
      }
      // The expense was created directly by pay() without debiting the account again (see comment
      // there), so it's removed directly here too — going through ExpensesService.remove() would
      // credit the account a second time.
      if (invoice.paidExpenseId) {
        await tx.expense.deleteMany({ where: { id: invoice.paidExpenseId } });
      }

      const reversed = await tx.creditCardInvoice.update({
        where: { id: invoiceId },
        data: {
          status: CreditCardInvoiceStatus.OPEN,
          paidAmount: 0,
          paidAt: null,
          paidFromAccountId: null,
          paidExpenseId: null,
          reversedAt: startOfTodaySaoPaulo(),
          reversalReason: dto.reason,
        },
      });
      await recalculateCardAvailableLimit(tx, invoice.cardId);
      return reversed;
    });

    return this.toPublic(this.decorateStatus(updated));
  }

  /** Finds the global "Cartão de crédito" expense category (seeded by migration), falling back to
   * a per-user one, creating it on demand if neither exists. */
  private async resolveCardExpenseCategoryId(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<string> {
    const existing = await tx.category.findFirst({
      where: {
        name: CARD_EXPENSE_CATEGORY_NAME,
        type: CategoryType.EXPENSE,
        OR: [{ userId: null }, { userId }],
      },
    });
    if (existing) return existing.id;

    const created = await tx.category.create({
      data: { userId: null, name: CARD_EXPENSE_CATEGORY_NAME, type: CategoryType.EXPENSE },
    });
    return created.id;
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

  /** A paid invoice can be reversed only until the following month's invoice would close — same
   * cycle length as the card's own closing day, one month ahead of this invoice's closing date. */
  private canReversePayment(invoice: CreditCardInvoice, today: Date): boolean {
    if (invoice.status !== CreditCardInvoiceStatus.PAID) return false;
    const deadline = addMonthsToDateOnly(invoice.closingDate, 1);
    return today < deadline;
  }

  private toPublic(invoice: CreditCardInvoice): PublicInvoice {
    return {
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      canReverse: this.canReversePayment(invoice, startOfTodaySaoPaulo()),
    };
  }
}
