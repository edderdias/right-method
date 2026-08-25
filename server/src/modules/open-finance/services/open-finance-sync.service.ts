import { Injectable, Logger } from "@nestjs/common";
import { ConnectionStatus } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AppConfigService } from "../../../config/app-config.service";
import {
  OpenFinanceAccountNotFoundException,
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

export interface SyncResult {
  importedCount: number;
}

@Injectable()
export class OpenFinanceSyncService {
  private readonly logger = new Logger(OpenFinanceSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggyClient: PluggyClientService,
    private readonly categorizer: TransactionCategorizerService,
    private readonly config: AppConfigService,
  ) {}

  async syncAccount(accountId: string): Promise<SyncResult> {
    const account = await this.prisma.connectedAccount.findUnique({
      where: { id: accountId },
      include: { connection: true },
    });
    if (!account) {
      throw new OpenFinanceAccountNotFoundException();
    }

    try {
      const [pluggyAccounts, transactions] = await Promise.all([
        this.pluggyClient.listAccounts(account.userId, account.connection.providerItemId),
        this.pluggyClient.listTransactions(account.userId, account.externalAccountId, {
          from: this.resolveSyncFrom(account.lastSyncAt),
          to: formatDateOnly(new Date()),
        }),
      ]);

      const lookup = await this.categorizer.buildCategoryLookup();
      let importedCount = 0;

      for (const tx of transactions) {
        await this.prisma.bankTransaction.upsert({
          where: {
            accountId_externalTransactionId: {
              accountId: account.id,
              externalTransactionId: tx.id,
            },
          },
          update: {
            description: tx.description,
            merchantName: tx.merchant?.name ?? null,
            amount: Math.abs(tx.amount),
            type: tx.type,
            status: tx.status,
            transactionDate: parseDateOnly(tx.date),
          },
          create: {
            userId: account.userId,
            accountId: account.id,
            externalTransactionId: tx.id,
            description: tx.description,
            merchantName: tx.merchant?.name ?? null,
            amount: Math.abs(tx.amount),
            type: tx.type,
            status: tx.status,
            transactionDate: parseDateOnly(tx.date),
            categoryId: this.categorizer.categorize(
              lookup,
              tx.type,
              tx.description,
              tx.merchant?.name,
            ),
          },
        });
        importedCount += 1;
      }

      const matchingPluggyAccount = pluggyAccounts.find(
        (pluggyAccount) => pluggyAccount.id === account.externalAccountId,
      );

      await this.prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          ...(matchingPluggyAccount ? { balance: matchingPluggyAccount.balance } : {}),
          status: ConnectionStatus.CONNECTED,
          lastSyncAt: new Date(),
        },
      });

      return { importedCount };
    } catch (error) {
      this.logger.error(`Sync failed for connected account ${accountId}`, error as Error);
      await this.prisma.connectedAccount
        .update({ where: { id: account.id }, data: { status: ConnectionStatus.ERROR } })
        .catch(() => undefined);
      throw error instanceof OpenFinanceSyncFailedException
        ? error
        : new OpenFinanceSyncFailedException();
    }
  }

  /** First sync pulls the configured lookback window; later syncs resume 1 day before the last
   * successful sync to absorb any late-settling PENDING → POSTED transitions. */
  private resolveSyncFrom(lastSyncAt: Date | null): string {
    if (!lastSyncAt) {
      const days = this.config.get("OPEN_FINANCE_INITIAL_SYNC_DAYS");
      return formatDateOnly(addDaysToDateOnly(startOfTodaySaoPaulo(), -days));
    }
    return formatDateOnly(addDaysToDateOnly(lastSyncAt, -1));
  }
}
