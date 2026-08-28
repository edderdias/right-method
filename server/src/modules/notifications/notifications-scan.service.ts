import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CreditCardInvoiceStatus, ExpenseStatus, InvestmentStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { addDaysToDateOnly, startOfTodaySaoPaulo } from "../../common/utils/date-only";
import { NotificationsService } from "./notifications.service";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const BILL_DUE_LOOKAHEAD_DAYS = 3;
const INVOICE_LOOKAHEAD_DAYS = 3;
const INVESTMENT_MATURITY_LOOKAHEAD_DAYS = 7;
const LOW_BALANCE_THRESHOLD = 500;
const LOW_BALANCE_COOLDOWN_HOURS = 24;

/** Scheduled scans for notification categories that have no single mutation to hook into — nothing
 * "happens" when a bill becomes due in 3 days, calendar time just passes, so these run daily. */
@Injectable()
export class NotificationsScanService {
  private readonly logger = new Logger(NotificationsScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDailyScans(): Promise<void> {
    await this.scanBillsDue().catch((error) => this.logScanError("bills due", error));
    await this.scanCardInvoices().catch((error) => this.logScanError("card invoices", error));
    await this.scanInvestmentMaturity().catch((error) => this.logScanError("investment maturity", error));
    await this.scanLowBalance().catch((error) => this.logScanError("low balance", error));
  }

  private async scanBillsDue(): Promise<void> {
    const today = startOfTodaySaoPaulo();
    const targetDate = addDaysToDateOnly(today, BILL_DUE_LOOKAHEAD_DAYS);

    const upcoming = await this.prisma.expense.findMany({
      where: { status: ExpenseStatus.PENDING, dueDate: targetDate },
      select: { id: true, userId: true, description: true, amount: true },
    });
    for (const expense of upcoming) {
      await this.notifications.create({
        userId: expense.userId,
        type: "BILL_DUE",
        title: "Conta a pagar em 3 dias",
        body: `${expense.description} — ${formatBRL(Number(expense.amount))} vence em ${BILL_DUE_LOOKAHEAD_DAYS} dias.`,
        link: "/despesas",
        entityId: expense.id,
      });
    }

    const dueToday = await this.prisma.expense.findMany({
      where: { status: ExpenseStatus.PENDING, dueDate: today },
      select: { id: true, userId: true, description: true, amount: true },
    });
    for (const expense of dueToday) {
      await this.notifications.create({
        userId: expense.userId,
        type: "BILL_DUE",
        title: "Conta vence hoje",
        body: `${expense.description} — ${formatBRL(Number(expense.amount))} vence hoje.`,
        link: "/despesas",
        entityId: `${expense.id}:due-today`,
      });
    }
  }

  private async scanCardInvoices(): Promise<void> {
    const targetDate = addDaysToDateOnly(startOfTodaySaoPaulo(), INVOICE_LOOKAHEAD_DAYS);

    const closing = await this.prisma.creditCardInvoice.findMany({
      where: { status: CreditCardInvoiceStatus.OPEN, closingDate: targetDate },
      select: { id: true, userId: true, totalAmount: true, card: { select: { name: true } } },
    });
    for (const invoice of closing) {
      await this.notifications.create({
        userId: invoice.userId,
        type: "CARD_INVOICE_CLOSING",
        title: "Fatura fechando em breve",
        body: `A fatura do cartão ${invoice.card.name} fecha em ${INVOICE_LOOKAHEAD_DAYS} dias.`,
        link: "/cartoes",
        entityId: invoice.id,
      });
    }

    const due = await this.prisma.creditCardInvoice.findMany({
      where: {
        status: { in: [CreditCardInvoiceStatus.CLOSED, CreditCardInvoiceStatus.DUE] },
        dueDate: targetDate,
      },
      select: { id: true, userId: true, totalAmount: true, card: { select: { name: true } } },
    });
    for (const invoice of due) {
      await this.notifications.create({
        userId: invoice.userId,
        type: "CARD_INVOICE_DUE",
        title: "Fatura vencendo em breve",
        body: `A fatura do cartão ${invoice.card.name} (${formatBRL(Number(invoice.totalAmount))}) vence em ${INVOICE_LOOKAHEAD_DAYS} dias.`,
        link: "/cartoes",
        entityId: invoice.id,
      });
    }

    const dueToday = await this.prisma.creditCardInvoice.findMany({
      where: {
        status: { notIn: [CreditCardInvoiceStatus.PAID] },
        dueDate: startOfTodaySaoPaulo(),
      },
      select: { id: true, userId: true, totalAmount: true, card: { select: { name: true } } },
    });
    for (const invoice of dueToday) {
      await this.notifications.create({
        userId: invoice.userId,
        type: "CARD_INVOICE_DUE",
        title: "Fatura vence hoje",
        body: `A fatura do cartão ${invoice.card.name} (${formatBRL(Number(invoice.totalAmount))}) vence hoje.`,
        link: "/cartoes",
        entityId: `${invoice.id}:due-today`,
      });
    }
  }

  private async scanInvestmentMaturity(): Promise<void> {
    const targetDate = addDaysToDateOnly(startOfTodaySaoPaulo(), INVESTMENT_MATURITY_LOOKAHEAD_DAYS);
    const investments = await this.prisma.investment.findMany({
      where: { status: InvestmentStatus.ACTIVE, maturityDate: targetDate },
      select: { id: true, userId: true, name: true },
    });

    for (const investment of investments) {
      await this.notifications.create({
        userId: investment.userId,
        type: "INVESTMENT_MATURITY",
        title: "Investimento vencendo em breve",
        body: `${investment.name} vence em ${INVESTMENT_MATURITY_LOOKAHEAD_DAYS} dias.`,
        link: "/investimentos",
        entityId: investment.id,
      });
    }
  }

  /** No single entity to de-dup against (it's a whole-account-balance state) — capped by a lookback
   * window instead of the (userId, type, entityId) uniqueness the other scans rely on. */
  private async scanLowBalance(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { notifyLowBalance: true },
      select: { id: true },
    });

    for (const { id: userId } of users) {
      const agg = await this.prisma.account.aggregate({
        where: { userId },
        _sum: { balance: true },
      });
      const balance = Number(agg._sum.balance ?? 0);
      if (balance >= LOW_BALANCE_THRESHOLD) continue;

      const alreadyNotified = await this.notifications.hasRecent(
        userId,
        "LOW_BALANCE",
        LOW_BALANCE_COOLDOWN_HOURS,
      );
      if (alreadyNotified) continue;

      await this.notifications.create({
        userId,
        type: "LOW_BALANCE",
        title: "Saldo baixo",
        body: `Seu saldo em contas está em ${formatBRL(balance)}, abaixo de ${formatBRL(LOW_BALANCE_THRESHOLD)}.`,
        link: "/contas",
      });
    }
  }

  private logScanError(scan: string, error: unknown): void {
    this.logger.error(`Notification scan failed: ${scan}`, error as Error);
  }
}
