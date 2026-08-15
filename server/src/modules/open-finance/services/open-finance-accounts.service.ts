import { Injectable } from "@nestjs/common";
import { AuditEvent, ConnectionStatus, type ConnectedAccount, type Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuditLogService } from "../../audit/audit-log.service";
import type { RequestMetadata } from "../../../common/utils/request-metadata";
import { OpenFinanceAccountNotFoundException } from "../../../common/exceptions/app.exception";
import { PluggyClientService } from "./pluggy-client.service";

const ACCOUNT_INCLUDE = { connection: true } as const;
type AccountWithConnection = Prisma.ConnectedAccountGetPayload<{ include: typeof ACCOUNT_INCLUDE }>;

export type PublicConnectedAccount = Omit<AccountWithConnection, "balance"> & { balance: number };

@Injectable()
export class OpenFinanceAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggyClient: PluggyClientService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForUser(userId: string): Promise<PublicConnectedAccount[]> {
    const accounts = await this.prisma.connectedAccount.findMany({
      where: { userId, status: { not: ConnectionStatus.DISCONNECTED } },
      include: ACCOUNT_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return accounts.map((account) => this.toPublic(account));
  }

  async getOwned(userId: string, accountId: string): Promise<PublicConnectedAccount> {
    const account = await this.assertOwnership(userId, accountId);
    return this.toPublic(account);
  }

  async listActiveIdsForConnection(connectionId: string): Promise<string[]> {
    const accounts = await this.prisma.connectedAccount.findMany({
      where: { connectionId, status: { not: ConnectionStatus.DISCONNECTED } },
      select: { id: true },
    });
    return accounts.map((account) => account.id);
  }

  async assertOwnership(userId: string, accountId: string): Promise<AccountWithConnection> {
    const account = await this.prisma.connectedAccount.findFirst({
      where: { id: accountId, userId },
      include: ACCOUNT_INCLUDE,
    });
    if (!account) {
      throw new OpenFinanceAccountNotFoundException();
    }
    return account;
  }

  async disconnect(
    userId: string,
    accountId: string,
    keepHistory: boolean,
    metadata: RequestMetadata,
  ): Promise<void> {
    const account = await this.assertOwnership(userId, accountId);

    await this.prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: ConnectionStatus.DISCONNECTED },
    });

    if (!keepHistory) {
      await this.prisma.bankTransaction.deleteMany({ where: { accountId: account.id } });
    }

    const remainingActiveAccounts = await this.prisma.connectedAccount.count({
      where: {
        connectionId: account.connectionId,
        status: { not: ConnectionStatus.DISCONNECTED },
      },
    });

    if (remainingActiveAccounts === 0) {
      await this.pluggyClient.deleteItem(account.connection.providerItemId).catch(() => undefined);
      await this.prisma.openFinanceConnection.update({
        where: { id: account.connectionId },
        data: { status: ConnectionStatus.DISCONNECTED },
      });
    }

    await this.auditLogService.record(
      AuditEvent.OPEN_FINANCE_ACCOUNT_DISCONNECTED,
      metadata,
      userId,
    );
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(
    account: ConnectedAccount & { connection: AccountWithConnection["connection"] },
  ): PublicConnectedAccount {
    return { ...account, balance: Number(account.balance) };
  }
}
