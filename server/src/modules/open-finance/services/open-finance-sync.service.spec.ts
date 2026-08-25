import { ConnectionStatus } from "@prisma/client";
import {
  OpenFinanceAccountNotFoundException,
  OpenFinanceSyncFailedException,
} from "../../../common/exceptions/app.exception";
import { OpenFinanceSyncService } from "./open-finance-sync.service";

function buildAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "acc-1",
    userId: "user-1",
    connectionId: "conn-1",
    externalAccountId: "pluggy-acc-1",
    balance: 100,
    lastSyncAt: null,
    connection: { id: "conn-1", providerItemId: "item-1" },
    ...overrides,
  };
}

function buildPluggyTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    accountId: "pluggy-acc-1",
    date: "2026-08-10",
    description: "Uber *Trip",
    amount: -25.5,
    type: "DEBIT" as const,
    status: "POSTED" as const,
    merchant: { name: "Uber" },
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    connectedAccount: { findUnique: jest.fn(), update: jest.fn() },
    bankTransaction: { upsert: jest.fn() },
  };
}

describe("OpenFinanceSyncService", () => {
  let prisma: any;
  let pluggyClient: any;
  let categorizer: any;
  let config: any;
  let service: OpenFinanceSyncService;

  beforeEach(() => {
    prisma = createPrismaMock();
    pluggyClient = {
      listAccounts: jest.fn().mockResolvedValue([]),
      listTransactions: jest.fn().mockResolvedValue([]),
    };
    categorizer = {
      buildCategoryLookup: jest.fn().mockResolvedValue(new Map()),
      categorize: jest.fn().mockReturnValue("cat-transporte"),
    };
    config = { get: jest.fn().mockReturnValue(365) };
    service = new OpenFinanceSyncService(prisma, pluggyClient, categorizer, config);
  });

  it("throws when the connected account does not exist", async () => {
    prisma.connectedAccount.findUnique.mockResolvedValue(null);

    await expect(service.syncAccount("acc-x")).rejects.toBeInstanceOf(
      OpenFinanceAccountNotFoundException,
    );
    expect(pluggyClient.listTransactions).not.toHaveBeenCalled();
  });

  it("upserts each transaction keyed by (accountId, externalTransactionId) for idempotent sync", async () => {
    prisma.connectedAccount.findUnique.mockResolvedValue(buildAccount());
    pluggyClient.listTransactions.mockResolvedValue([buildPluggyTransaction()]);
    prisma.bankTransaction.upsert.mockResolvedValue({});

    const result = await service.syncAccount("acc-1");

    expect(prisma.bankTransaction.upsert).toHaveBeenCalledTimes(1);
    const call = prisma.bankTransaction.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      accountId_externalTransactionId: { accountId: "acc-1", externalTransactionId: "tx-1" },
    });
    expect(result.importedCount).toBe(1);
  });

  it("stores the absolute amount and never overwrites category/notes on a repeat sync", async () => {
    prisma.connectedAccount.findUnique.mockResolvedValue(buildAccount());
    pluggyClient.listTransactions.mockResolvedValue([buildPluggyTransaction({ amount: -25.5 })]);
    prisma.bankTransaction.upsert.mockResolvedValue({});

    await service.syncAccount("acc-1");

    const { create, update } = prisma.bankTransaction.upsert.mock.calls[0][0];
    expect(create.amount).toBe(25.5);
    expect(create.categoryId).toBe("cat-transporte");
    expect(update).not.toHaveProperty("categoryId");
    expect(update).not.toHaveProperty("notes");
  });

  it("pulls the full configured lookback window on the first sync (no lastSyncAt)", async () => {
    prisma.connectedAccount.findUnique.mockResolvedValue(buildAccount({ lastSyncAt: null }));

    await service.syncAccount("acc-1");

    expect(config.get).toHaveBeenCalledWith("OPEN_FINANCE_INITIAL_SYNC_DAYS");
    const { from } = pluggyClient.listTransactions.mock.calls[0][2];
    expect(from).not.toBeNull();
  });

  it("resumes from just before the last successful sync on subsequent syncs", async () => {
    const lastSyncAt = new Date("2026-08-10T00:00:00.000Z");
    prisma.connectedAccount.findUnique.mockResolvedValue(buildAccount({ lastSyncAt }));

    await service.syncAccount("acc-1");

    const { from } = pluggyClient.listTransactions.mock.calls[0][2];
    expect(from).toBe("2026-08-09");
  });

  it("refreshes the account balance from the matching Pluggy account and marks it CONNECTED", async () => {
    prisma.connectedAccount.findUnique.mockResolvedValue(buildAccount());
    pluggyClient.listAccounts.mockResolvedValue([{ id: "pluggy-acc-1", balance: 842.13 }]);

    await service.syncAccount("acc-1");

    expect(prisma.connectedAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { balance: 842.13, status: ConnectionStatus.CONNECTED, lastSyncAt: expect.any(Date) },
    });
  });

  it("marks the account ERROR and rethrows when the Pluggy call fails", async () => {
    prisma.connectedAccount.findUnique.mockResolvedValue(buildAccount());
    prisma.connectedAccount.update.mockResolvedValue({});
    pluggyClient.listTransactions.mockRejectedValue(new Error("network down"));

    await expect(service.syncAccount("acc-1")).rejects.toBeInstanceOf(
      OpenFinanceSyncFailedException,
    );
    expect(prisma.connectedAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { status: ConnectionStatus.ERROR },
    });
  });
});
