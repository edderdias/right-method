import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CardPurchaseSource, CreditCardStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { addMonthsToDateOnly, startOfTodaySaoPaulo } from "../../common/utils/date-only";
import { recalculateCardAvailableLimit, recalculateInvoiceTotal } from "./credit-card-limit.util";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";

const RECURRING_PURCHASE_INCLUDE = { card: true } as const;

type RecurringPurchase = Prisma.CreditCardPurchaseGetPayload<{
  include: typeof RECURRING_PURCHASE_INCLUDE;
}>;

/**
 * Keeps recurring card purchases alive without ever generating them all up front — a recorrência
 * can be open-ended, so each cycle only clones the *next* occurrence of every still-open series.
 *
 * A "series" is the chain of purchases linked by `parentPurchaseId`; its open tip is the one entry
 * with `isRecurring: true` and no child yet. Once that tip's monthly anniversary date arrives, it's
 * cloned forward — routed through the same `resolveCycle` closing-day logic every other purchase
 * uses (credit-card-invoices.service.ts), so a clone that lands after the card's closing day rolls
 * into next month's invoice exactly like a manual purchase made on that date would (spec item:
 * lançar após o fechamento cai na fatura seguinte). The series stops on its own — no more clones —
 * once the user-informed `recurrenceEndDate` is reached, or the moment the user flips `isRecurring`
 * to false on the tip (see CreditCardPurchasesService#update).
 */
@Injectable()
export class CreditCardRecurringPurchasesService {
  private readonly logger = new Logger(CreditCardRecurringPurchasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: CreditCardInvoicesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async generateDueOccurrences(): Promise<void> {
    const today = startOfTodaySaoPaulo();
    const openSeriesTips = await this.prisma.creditCardPurchase.findMany({
      where: {
        isRecurring: true,
        childPurchases: { none: {} },
        card: { status: CreditCardStatus.ACTIVE },
      },
      include: RECURRING_PURCHASE_INCLUDE,
    });

    for (const tip of openSeriesTips) {
      try {
        await this.rollOne(tip, today);
      } catch (error) {
        this.logger.error(`Failed to roll recurring purchase ${tip.id}`, error as Error);
      }
    }
  }

  private async rollOne(tip: RecurringPurchase, today: Date): Promise<void> {
    const nextDate = addMonthsToDateOnly(tip.purchaseDate, 1);

    if (tip.recurrenceEndDate && nextDate > tip.recurrenceEndDate) {
      // Reached the user-informed end — turn the series off so it's skipped on future scans.
      await this.prisma.creditCardPurchase.update({
        where: { id: tip.id },
        data: { isRecurring: false },
      });
      return;
    }

    if (nextDate > today) return; // not due yet, try again on a later scan

    await this.prisma.$transaction(async (tx) => {
      const invoice = await this.invoicesService.getOrCreateInvoice(tx, {
        userId: tip.userId,
        cardId: tip.cardId,
        closingDay: tip.card.closingDay,
        dueDay: tip.card.dueDay,
        purchaseDate: nextDate,
      });

      await tx.creditCardPurchase.create({
        data: {
          userId: tip.userId,
          cardId: tip.cardId,
          invoiceId: invoice.id,
          description: tip.description,
          amount: tip.amount,
          purchaseDate: nextDate,
          categoryId: tip.categoryId,
          responsibleName: tip.responsibleName,
          notes: tip.notes,
          source: CardPurchaseSource.MANUAL,
          isRecurring: true,
          recurrenceEndDate: tip.recurrenceEndDate,
          parentPurchaseId: tip.id,
        },
      });

      await recalculateInvoiceTotal(tx, invoice.id);
      await recalculateCardAvailableLimit(tx, tip.cardId);
    });
  }
}
