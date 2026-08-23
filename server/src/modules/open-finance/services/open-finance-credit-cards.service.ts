import { Injectable, Logger } from "@nestjs/common";
import {
  BankTransactionType,
  CardPurchaseSource,
  CreditCardSource,
  CreditCardStatus,
} from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AppConfigService } from "../../../config/app-config.service";
import {
  CreditCardNotFoundException,
  OpenFinanceConnectionNotFoundException,
  OpenFinanceSyncFailedException,
} from "../../../common/exceptions/app.exception";
import {
  addDaysToDateOnly,
  formatDateOnly,
  parseDateOnly,
  startOfTodaySaoPaulo,
} from "../../../common/utils/date-only";
import { PluggyClientService } from "./pluggy-client.service";
import { TransactionCategorizerService } from "./transaction-categorizer.service";
import type { PluggyAccount } from "../pluggy.types";

export interface OpenFinanceSyncResult {
  importedCount: number;
}

@Injectable()
export class OpenFinanceCreditCardsService {
  private readonly logger = new Logger(OpenFinanceCreditCardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggyClient: PluggyClientService,
    private readonly categorizer: TransactionCategorizerService,
    private readonly config: AppConfigService,
  ) {}

  /** Pluggy CREDIT accounts under a connection that haven't been added as a CreditCard yet. */
  async listAvailable(userId: string, connectionId: string): Promise<PluggyAccount[]> {
    const connection = await this.assertConnectionOwnership(userId, connectionId);
    const pluggyAccounts = await this.pluggyClient.listAccounts(connection.providerItemId);

    const importedExternalIds = new Set(
      (
        await this.prisma.creditCard.findMany({
          where: { connectionId },
          select: { externalCardId: true },
        })
      ).map((card) => card.externalCardId),
    );

    return pluggyAccounts.filter(
      (account) => account.type === "CREDIT" && !importedExternalIds.has(account.id),
    );
  }

  async addCard(userId: string, connectionId: string, externalCardId: string) {
    const connection = await this.assertConnectionOwnership(userId, connectionId);
    const pluggyAccounts = await this.pluggyClient.listAccounts(connection.providerItemId);
    const pluggyAccount = pluggyAccounts.find(
      (account) => account.id === externalCardId && account.type === "CREDIT",
    );
    if (!pluggyAccount) {
      throw new CreditCardNotFoundException();
    }

    const creditData = pluggyAccount.creditData ?? null;
    const card = await this.prisma.creditCard.create({
      data: {
        userId,
        connectionId,
        externalCardId: pluggyAccount.id,
        institutionName: connection.institutionName,
        name: pluggyAccount.marketingName ?? pluggyAccount.name,
        brand: creditData?.brand ?? null,
        lastFourDigits: pluggyAccount.number ? pluggyAccount.number.slice(-4) : null,
        creditLimit: creditData?.creditLimit ?? null,
        availableLimit: creditData?.availableCreditLimit ?? null,
        closingDay: this.dayOfMonth(creditData?.balanceCloseDate),
        dueDay: this.dayOfMonth(creditData?.balanceDueDate),
        source: CreditCardSource.OPEN_FINANCE,
        status: CreditCardStatus.ACTIVE,
      },
    });

    await this.syncCard(userId, card.id);
    return this.prisma.creditCard.findUniqueOrThrow({ where: { id: card.id } });
  }

  async syncCard(userId: string, cardId: string): Promise<OpenFinanceSyncResult> {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: cardId, userId },
      include: { connection: true },
    });
    if (!card || !card.connection || !card.externalCardId) {
      throw new CreditCardNotFoundException();
    }

    try {
      const [pluggyAccounts, transactions] = await Promise.all([
        this.pluggyClient.listAccounts(card.connection.providerItemId),
        this.pluggyClient.listTransactions(card.externalCardId, {
          from: this.resolveSyncFrom(card.lastSyncAt),
          to: formatDateOnly(new Date()),
        }),
      ]);

      const lookup = await this.categorizer.buildCategoryLookup();
      const billCache = new Map<
        string,
        { closingDate: Date; dueDate: Date; totalAmount: number }
      >();
      let importedCount = 0;

      for (const tx of transactions) {
        const metadata = tx.creditCardMetadata;
        if (!metadata) continue;

        const dueDateHint = metadata.billForecastDate
          ? parseDateOnly(`${metadata.billForecastDate}-01`)
          : parseDateOnly(metadata.purchaseDate ?? tx.date);
        const referenceMonth = new Date(
          Date.UTC(dueDateHint.getUTCFullYear(), dueDateHint.getUTCMonth(), 1),
        );

        let billInfo = metadata.billId ? billCache.get(metadata.billId) : undefined;
        if (!billInfo && metadata.billId) {
          try {
            const bill = await this.pluggyClient.getBill(metadata.billId);
            billInfo = {
              closingDate: bill.billClosingDate
                ? parseDateOnly(bill.billClosingDate)
                : referenceMonth,
              dueDate: parseDateOnly(bill.dueDate),
              totalAmount: bill.totalAmount,
            };
            billCache.set(metadata.billId, billInfo);
          } catch {
            // Bill lookup is best-effort — the purchase still gets recorded under a
            // reference-month invoice even if the provider can't resolve the bill right now.
          }
        }

        const invoice = await this.prisma.creditCardInvoice.upsert({
          where: { cardId_referenceMonth: { cardId: card.id, referenceMonth } },
          update: billInfo
            ? {
                closingDate: billInfo.closingDate,
                dueDate: billInfo.dueDate,
                totalAmount: billInfo.totalAmount,
              }
            : {},
          create: {
            userId: card.userId,
            cardId: card.id,
            referenceMonth,
            closingDate: billInfo?.closingDate ?? referenceMonth,
            dueDate: billInfo?.dueDate ?? referenceMonth,
            totalAmount: billInfo?.totalAmount ?? 0,
          },
        });

        await this.prisma.creditCardPurchase.upsert({
          where: {
            cardId_externalTransactionId: { cardId: card.id, externalTransactionId: tx.id },
          },
          update: {
            invoiceId: invoice.id,
            description: tx.description,
            merchantName: tx.merchant?.name ?? null,
            amount: Math.abs(metadata.totalAmount ?? tx.amount),
            purchaseDate: parseDateOnly(metadata.purchaseDate ?? tx.date),
            installmentNumber: metadata.installmentNumber ?? null,
            installmentTotal: metadata.totalInstallments ?? null,
          },
          create: {
            userId: card.userId,
            cardId: card.id,
            invoiceId: invoice.id,
            externalTransactionId: tx.id,
            description: tx.description,
            merchantName: tx.merchant?.name ?? null,
            amount: Math.abs(metadata.totalAmount ?? tx.amount),
            purchaseDate: parseDateOnly(metadata.purchaseDate ?? tx.date),
            categoryId: this.categorizer.categorize(
              lookup,
              BankTransactionType.DEBIT,
              tx.description,
              tx.merchant?.name,
            ),
            source: CardPurchaseSource.OPEN_FINANCE,
            installmentNumber: metadata.installmentNumber ?? null,
            installmentTotal: metadata.totalInstallments ?? null,
          },
        });
        importedCount += 1;
      }

      const matchingAccount = pluggyAccounts.find((account) => account.id === card.externalCardId);
      const creditData = matchingAccount?.creditData ?? null;

      await this.prisma.creditCard.update({
        where: { id: card.id },
        data: {
          ...(creditData?.creditLimit != null ? { creditLimit: creditData.creditLimit } : {}),
          ...(creditData?.availableCreditLimit != null
            ? { availableLimit: creditData.availableCreditLimit }
            : {}),
          lastSyncAt: new Date(),
        },
      });

      return { importedCount };
    } catch (error) {
      this.logger.error(`Sync failed for credit card ${cardId}`, error as Error);
      throw error instanceof OpenFinanceSyncFailedException
        ? error
        : new OpenFinanceSyncFailedException();
    }
  }

  private async assertConnectionOwnership(userId: string, connectionId: string) {
    const connection = await this.prisma.openFinanceConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!connection) {
      throw new OpenFinanceConnectionNotFoundException();
    }
    return connection;
  }

  private dayOfMonth(isoDate?: string | null): number | null {
    if (!isoDate) return null;
    return parseDateOnly(isoDate).getUTCDate();
  }

  /** Same lookback rule as OpenFinanceSyncService: full configured window on first sync, then
   * resume 1 day before the last successful sync. */
  private resolveSyncFrom(lastSyncAt: Date | null): string {
    if (!lastSyncAt) {
      const days = this.config.get("OPEN_FINANCE_INITIAL_SYNC_DAYS");
      return formatDateOnly(addDaysToDateOnly(startOfTodaySaoPaulo(), -days));
    }
    return formatDateOnly(addDaysToDateOnly(lastSyncAt, -1));
  }
}
