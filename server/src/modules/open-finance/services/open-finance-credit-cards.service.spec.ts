import { CreditCardSource, CreditCardStatus } from "@prisma/client";
import { CreditCardNotFoundException } from "../../../common/exceptions/app.exception";
import { OpenFinanceCreditCardsService } from "./open-finance-credit-cards.service";
import type { PluggyAccount, PluggyBill, PluggyTransaction } from "../pluggy.types";

function createPrismaMock() {
  const prisma: any = {
    creditCard: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    creditCardInvoice: {
      upsert: jest.fn(),
    },
    creditCardPurchase: {
      upsert: jest.fn(),
    },
    openFinanceConnection: {
      findFirst: jest.fn(),
    },
  };
  return prisma;
}

function buildPluggyCreditAccount(overrides: Partial<PluggyAccount> = {}): PluggyAccount {
  return {
    id: "pluggy-card-1",
    itemId: "item-1",
    type: "CREDIT",
    subtype: "CREDIT_CARD",
    number: "1111222233334589",
    name: "Cartão Nubank",
    marketingName: "Nubank Mastercard",
    balance: -450,
    currencyCode: "BRL",
    creditData: {
      brand: "Mastercard",
      balanceCloseDate: "2026-08-10",
      balanceDueDate: "2026-08-20",
      creditLimit: 8000,
      availableCreditLimit: 5550,
    },
    ...overrides,
  };
}

describe("OpenFinanceCreditCardsService", () => {
  let prisma: any;
  let pluggyClient: any;
  let categorizer: any;
  let config: any;
  let service: OpenFinanceCreditCardsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    pluggyClient = {
      listAccounts: jest.fn(),
      listTransactions: jest.fn(),
      getBill: jest.fn(),
    };
    categorizer = {
      buildCategoryLookup: jest.fn().mockResolvedValue(new Map()),
      categorize: jest.fn().mockReturnValue(null),
    };
    config = { get: jest.fn().mockReturnValue(90) };
    service = new OpenFinanceCreditCardsService(prisma, pluggyClient, categorizer, config);
  });

  describe("listAvailable", () => {
    it("only returns CREDIT accounts not yet imported as a card", async () => {
      prisma.openFinanceConnection.findFirst.mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        providerItemId: "item-1",
        institutionName: "Banco Inter",
      });
      pluggyClient.listAccounts.mockResolvedValue([
        buildPluggyCreditAccount({ id: "card-a" }),
        buildPluggyCreditAccount({ id: "card-b" }),
        { ...buildPluggyCreditAccount({ id: "bank-a" }), type: "BANK" },
      ]);
      prisma.creditCard.findMany.mockResolvedValue([{ externalCardId: "card-a" }]);

      const result = await service.listAvailable("user-1", "conn-1");

      expect(result.map((account) => account.id)).toEqual(["card-b"]);
    });

    it("throws when the connection does not belong to the user", async () => {
      prisma.openFinanceConnection.findFirst.mockResolvedValue(null);

      await expect(service.listAvailable("user-1", "conn-x")).rejects.toThrow();
    });
  });

  describe("addCard", () => {
    it("creates the card from the provider's creditData and derives closing/due day from the dates", async () => {
      prisma.openFinanceConnection.findFirst.mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        providerItemId: "item-1",
        institutionName: "Banco Inter",
      });
      pluggyClient.listAccounts.mockResolvedValue([buildPluggyCreditAccount()]);
      pluggyClient.listTransactions.mockResolvedValue([]);
      prisma.creditCard.create.mockResolvedValue({ id: "card-1" });
      prisma.creditCard.findFirst.mockResolvedValue({
        id: "card-1",
        userId: "user-1",
        externalCardId: "pluggy-card-1",
        lastSyncAt: null,
        connection: { providerItemId: "item-1" },
      });
      prisma.creditCard.findUniqueOrThrow.mockResolvedValue({
        id: "card-1",
        source: CreditCardSource.OPEN_FINANCE,
      });

      await service.addCard("user-1", "conn-1", "pluggy-card-1");

      expect(prisma.creditCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: CreditCardSource.OPEN_FINANCE,
            connectionId: "conn-1",
            externalCardId: "pluggy-card-1",
            brand: "Mastercard",
            lastFourDigits: "4589",
            creditLimit: 8000,
            availableLimit: 5550,
            closingDay: 10,
            dueDay: 20,
            status: CreditCardStatus.ACTIVE,
          }),
        }),
      );
    });

    it("throws when the requested account isn't a CREDIT account on that connection", async () => {
      prisma.openFinanceConnection.findFirst.mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        providerItemId: "item-1",
      });
      pluggyClient.listAccounts.mockResolvedValue([]);

      await expect(service.addCard("user-1", "conn-1", "missing")).rejects.toBeInstanceOf(
        CreditCardNotFoundException,
      );
    });
  });

  describe("syncCard", () => {
    const card = {
      id: "card-1",
      userId: "user-1",
      externalCardId: "pluggy-card-1",
      lastSyncAt: null,
      connection: { providerItemId: "item-1" },
    };

    it("enforces ownership — a card belonging to another user cannot be synced", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(null);

      await expect(service.syncCard("user-1", "card-1")).rejects.toBeInstanceOf(
        CreditCardNotFoundException,
      );
      expect(pluggyClient.listTransactions).not.toHaveBeenCalled();
    });

    it("upserts a purchase and its invoice, deduping by externalTransactionId", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(card);
      pluggyClient.listAccounts.mockResolvedValue([buildPluggyCreditAccount()]);
      const tx: PluggyTransaction = {
        id: "tx-1",
        accountId: "pluggy-card-1",
        date: "2026-08-05",
        description: "Supermercado",
        amount: 350,
        type: "DEBIT",
        status: "POSTED",
        merchant: { name: "Supermercado Real" },
        creditCardMetadata: {
          installmentNumber: 1,
          totalInstallments: 1,
          totalAmount: 350,
          billId: "bill-1",
          purchaseDate: "2026-08-05",
        },
      };
      pluggyClient.listTransactions.mockResolvedValue([tx]);
      const bill: PluggyBill = {
        id: "bill-1",
        dueDate: "2026-08-20",
        billClosingDate: "2026-08-10",
        totalAmount: 350,
        totalAmountCurrencyCode: "BRL",
      };
      pluggyClient.getBill.mockResolvedValue(bill);
      prisma.creditCardInvoice.upsert.mockResolvedValue({ id: "inv-1" });

      const result = await service.syncCard("user-1", "card-1");

      expect(result.importedCount).toBe(1);
      expect(prisma.creditCardPurchase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cardId_externalTransactionId: { cardId: "card-1", externalTransactionId: "tx-1" },
          },
          create: expect.objectContaining({
            amount: 350,
            source: "OPEN_FINANCE",
            invoiceId: "inv-1",
          }),
        }),
      );
      expect(prisma.creditCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "card-1" },
          data: expect.objectContaining({ creditLimit: 8000, availableLimit: 5550 }),
        }),
      );
    });

    it("skips transactions without creditCardMetadata instead of importing them as purchases", async () => {
      prisma.creditCard.findFirst.mockResolvedValue(card);
      pluggyClient.listAccounts.mockResolvedValue([buildPluggyCreditAccount()]);
      pluggyClient.listTransactions.mockResolvedValue([
        {
          id: "tx-2",
          accountId: "pluggy-card-1",
          date: "2026-08-05",
          description: "Sem metadata",
          amount: 10,
          type: "DEBIT",
          status: "POSTED",
        } as PluggyTransaction,
      ]);

      const result = await service.syncCard("user-1", "card-1");

      expect(result.importedCount).toBe(0);
      expect(prisma.creditCardPurchase.upsert).not.toHaveBeenCalled();
    });
  });
});
