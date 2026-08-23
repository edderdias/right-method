import { Injectable } from "@nestjs/common";
import { AuditEvent, ConnectionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AppConfigService } from "../../../config/app-config.service";
import { AuditLogService } from "../../audit/audit-log.service";
import type { RequestMetadata } from "../../../common/utils/request-metadata";
import { OpenFinanceConnectionNotFoundException } from "../../../common/exceptions/app.exception";
import { PluggyClientService } from "./pluggy-client.service";
import { OpenFinanceSyncService } from "./open-finance-sync.service";
import { mapPluggyItemStatus } from "../pluggy-status.util";
import type { PluggyAccount } from "../pluggy.types";

type ConnectionWithAccounts = Prisma.OpenFinanceConnectionGetPayload<{
  include: { accounts: true };
}>;

@Injectable()
export class OpenFinanceConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly pluggyClient: PluggyClientService,
    private readonly syncService: OpenFinanceSyncService,
    private readonly auditLogService: AuditLogService,
  ) {}

  createConnectToken(userId: string, itemId?: string): Promise<string> {
    return this.pluggyClient.createConnectToken(userId, {
      itemId,
      webhookUrl: this.buildWebhookUrl(),
    });
  }

  /** Registers/refreshes the connection for a Pluggy item and returns the accounts under it
   * that the user hasn't imported into the Método Certo yet. */
  async registerConnection(
    userId: string,
    itemId: string,
  ): Promise<{ connection: ConnectionWithAccounts; availableAccounts: PluggyAccount[] }> {
    const [item, pluggyAccounts] = await Promise.all([
      this.pluggyClient.getItem(itemId),
      this.pluggyClient.listAccounts(itemId),
    ]);

    const connection = await this.prisma.openFinanceConnection.upsert({
      where: { providerItemId: itemId },
      update: {
        institutionName: item.connector.name,
        institutionImageUrl: item.connector.imageUrl,
        status: mapPluggyItemStatus(item.status),
      },
      create: {
        userId,
        providerItemId: itemId,
        institutionName: item.connector.name,
        institutionImageUrl: item.connector.imageUrl,
        status: mapPluggyItemStatus(item.status),
      },
      include: { accounts: true },
    });

    const importedExternalIds = new Set(
      connection.accounts.map((account) => account.externalAccountId),
    );
    // CREDIT-type accounts are handled by the Cartões module (OpenFinanceCreditCardsService),
    // not imported here as bank accounts — keeps a card from ever being offered twice.
    const availableAccounts = pluggyAccounts.filter(
      (pluggyAccount) =>
        pluggyAccount.type === "BANK" && !importedExternalIds.has(pluggyAccount.id),
    );

    return { connection, availableAccounts };
  }

  async listForUser(userId: string): Promise<ConnectionWithAccounts[]> {
    return this.prisma.openFinanceConnection.findMany({
      where: { userId },
      include: { accounts: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async selectAccounts(
    userId: string,
    connectionId: string,
    externalAccountIds: string[],
    metadata: RequestMetadata,
  ): Promise<void> {
    const connection = await this.assertOwnership(userId, connectionId);
    const pluggyAccounts = await this.pluggyClient.listAccounts(connection.providerItemId);
    const byId = new Map(pluggyAccounts.map((account) => [account.id, account]));

    for (const externalAccountId of externalAccountIds) {
      const pluggyAccount = byId.get(externalAccountId);
      // Defense in depth: CREDIT accounts only ever get imported via the Cartões module.
      if (!pluggyAccount || pluggyAccount.type !== "BANK") continue;

      const created = await this.prisma.connectedAccount.upsert({
        where: {
          connectionId_externalAccountId: { connectionId, externalAccountId },
        },
        update: {},
        create: {
          userId,
          connectionId,
          externalAccountId: pluggyAccount.id,
          accountType: pluggyAccount.type,
          accountSubtype: pluggyAccount.subtype,
          name: pluggyAccount.name,
          marketingName: pluggyAccount.marketingName,
          numberMasked: pluggyAccount.number,
          balance: pluggyAccount.balance,
          currencyCode: pluggyAccount.currencyCode,
          status: ConnectionStatus.SYNCING,
        },
      });

      await this.auditLogService.record(AuditEvent.OPEN_FINANCE_ACCOUNT_ADDED, metadata, userId);
      await this.syncService.syncAccount(created.id);
    }
  }

  async disconnectConnection(
    userId: string,
    connectionId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const connection = await this.assertOwnership(userId, connectionId);

    await this.pluggyClient.deleteItem(connection.providerItemId).catch(() => undefined);

    await this.prisma.$transaction([
      this.prisma.connectedAccount.updateMany({
        where: { connectionId },
        data: { status: ConnectionStatus.DISCONNECTED },
      }),
      this.prisma.openFinanceConnection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.DISCONNECTED },
      }),
    ]);

    await this.auditLogService.record(
      AuditEvent.OPEN_FINANCE_ACCOUNT_DISCONNECTED,
      metadata,
      userId,
    );
  }

  /** Applies a fresh item status coming from a Pluggy webhook to the matching connection. */
  async syncItemStatus(providerItemId: string): Promise<string | null> {
    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { providerItemId },
    });
    if (!connection) return null;

    const item = await this.pluggyClient.getItem(providerItemId);
    await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: {
        status: mapPluggyItemStatus(item.status),
        lastSyncAt: new Date(),
      },
    });
    return connection.id;
  }

  private async assertOwnership(userId: string, connectionId: string) {
    const connection = await this.prisma.openFinanceConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!connection) {
      throw new OpenFinanceConnectionNotFoundException();
    }
    return connection;
  }

  private buildWebhookUrl(): string | undefined {
    const base = this.config.get("API_PUBLIC_URL");
    if (!base) return undefined;
    const secret = this.config.get("PLUGGY_WEBHOOK_SECRET");
    return `${base}/api/open-finance/webhook?token=${encodeURIComponent(secret)}`;
  }
}
