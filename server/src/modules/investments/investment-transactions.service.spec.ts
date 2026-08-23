import {
  InvestmentSource,
  InvestmentStatus,
  InvestmentTransactionType,
  InvestmentType,
  Prisma,
} from "@prisma/client";
import { InvestmentInsufficientQuantityException } from "../../common/exceptions/app.exception";
import { InvestmentTransactionsService } from "./investment-transactions.service";
import type { Investment } from "@prisma/client";

function createPrismaMock() {
  const prisma: any = {
    investment: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    investmentTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

function buildInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: "inv-1",
    userId: "user-1",
    connectionId: null,
    externalInvestmentId: null,
    type: InvestmentType.FIIS,
    ticker: "XPML11",
    name: "XP Malls",
    institutionName: "XP",
    quantity: new Prisma.Decimal(0) as any,
    averagePrice: null,
    investedAmount: new Prisma.Decimal(0) as any,
    currentValue: new Prisma.Decimal(0) as any,
    currentPrice: null,
    issuer: null,
    rate: null,
    indexer: null,
    maturityDate: null,
    liquidity: null,
    source: InvestmentSource.MANUAL,
    status: InvestmentStatus.ACTIVE,
    lastSyncAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    userId: "user-1",
    investmentId: "inv-1",
    externalTransactionId: null,
    type: InvestmentTransactionType.BUY,
    quantity: null,
    unitPrice: null,
    amount: new Prisma.Decimal(0),
    fees: new Prisma.Decimal(0),
    transactionDate: new Date("2026-08-01T00:00:00.000Z"),
    realizedGain: null,
    notes: null,
    source: "MANUAL",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("InvestmentTransactionsService", () => {
  let prisma: any;
  let service: InvestmentTransactionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new InvestmentTransactionsService(prisma);
    prisma.investmentTransaction.create.mockImplementation(({ data }: any) =>
      Promise.resolve(buildTransaction({ ...data, id: "tx-new" })),
    );
    prisma.investmentTransaction.update.mockImplementation(({ where, data }: any) =>
      Promise.resolve(buildTransaction({ id: where.id, ...data })),
    );
  });

  describe("create — BUY", () => {
    it("recomputes the weighted-average price across two sequential buys", async () => {
      // First buy: 100 units at R$100 = R$10.000
      const investment = buildInvestment();
      await service.create("user-1", investment, {
        type: InvestmentTransactionType.BUY,
        quantity: 100,
        unitPrice: 100,
        amount: 10000,
        transactionDate: "2026-08-01",
      } as any);

      const firstUpdate = prisma.investment.update.mock.calls[0][0].data;
      expect(firstUpdate.quantity).toBe(100);
      expect(firstUpdate.averagePrice).toBe(100);
      expect(firstUpdate.investedAmount).toBe(10000);

      // Second buy: 50 units at R$110 = R$5.500, applied on top of the post-first-buy investment
      const afterFirstBuy = buildInvestment({
        quantity: new Prisma.Decimal(100) as any,
        averagePrice: new Prisma.Decimal(100) as any,
        investedAmount: new Prisma.Decimal(10000) as any,
        currentValue: new Prisma.Decimal(10000) as any,
      });
      await service.create("user-1", afterFirstBuy, {
        type: InvestmentTransactionType.BUY,
        quantity: 50,
        unitPrice: 110,
        amount: 5500,
        transactionDate: "2026-08-10",
      } as any);

      const secondUpdate = prisma.investment.update.mock.calls[1][0].data;
      expect(secondUpdate.quantity).toBe(150);
      expect(secondUpdate.investedAmount).toBe(15500);
      expect(secondUpdate.averagePrice).toBeCloseTo(103.33, 2);
    });

    it("tracks currentValue 1:1 with investedAmount when there is no live price mark", async () => {
      const investment = buildInvestment();
      await service.create("user-1", investment, {
        type: InvestmentTransactionType.BUY,
        quantity: 100,
        unitPrice: 100,
        amount: 10000,
        transactionDate: "2026-08-01",
      } as any);

      const update = prisma.investment.update.mock.calls[0][0].data;
      expect(update.currentValue).toBe(10000);
    });
  });

  describe("create — SELL", () => {
    it("computes realizedGain as proceeds minus proportional cost basis, not the sale amount itself", async () => {
      const investment = buildInvestment({
        quantity: new Prisma.Decimal(100) as any,
        averagePrice: new Prisma.Decimal(100) as any,
        investedAmount: new Prisma.Decimal(10000) as any,
        currentValue: new Prisma.Decimal(10000) as any,
      });

      const result = await service.create("user-1", investment, {
        type: InvestmentTransactionType.SELL,
        quantity: 20,
        unitPrice: 120,
        amount: 2400,
        transactionDate: "2026-08-15",
      } as any);

      // Proportional cost basis for 20/100 units = R$2.000; proceeds R$2.400 → gain R$400
      expect(result.realizedGain).toBe(400);

      const update = prisma.investment.update.mock.calls[0][0].data;
      expect(update.quantity).toBe(80);
      expect(update.investedAmount).toBe(8000);
    });

    it("never lets quantity or investedAmount go negative", async () => {
      const investment = buildInvestment({
        quantity: new Prisma.Decimal(10) as any,
        investedAmount: new Prisma.Decimal(1000) as any,
        currentValue: new Prisma.Decimal(1000) as any,
      });

      await service.create("user-1", investment, {
        type: InvestmentTransactionType.SELL,
        quantity: 10,
        amount: 1200,
        transactionDate: "2026-08-15",
      } as any);

      const update = prisma.investment.update.mock.calls[0][0].data;
      expect(update.quantity).toBe(0);
      expect(update.investedAmount).toBe(0);
    });

    it("rejects selling more than the held quantity", async () => {
      const investment = buildInvestment({
        quantity: new Prisma.Decimal(10) as any,
        investedAmount: new Prisma.Decimal(1000) as any,
      });

      await expect(
        service.create("user-1", investment, {
          type: InvestmentTransactionType.SELL,
          quantity: 20,
          amount: 2000,
          transactionDate: "2026-08-15",
        } as any),
      ).rejects.toBeInstanceOf(InvestmentInsufficientQuantityException);
      expect(prisma.investmentTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe("create — WITHDRAW on an untracked-quantity position (e.g. renda fixa)", () => {
    it("prorates the cost basis by value instead of units when quantity is 0", async () => {
      // CDB: R$10.000 invested, marked to R$10.850 (accrued interest, no live price feed).
      const investment = buildInvestment({
        type: InvestmentType.RENDA_FIXA,
        quantity: new Prisma.Decimal(0) as any,
        investedAmount: new Prisma.Decimal(10000) as any,
        currentValue: new Prisma.Decimal(10850) as any,
        currentPrice: new Prisma.Decimal(1) as any, // simulate a live mark so currentValue isn't touched
      });

      const result = await service.create("user-1", investment, {
        type: InvestmentTransactionType.WITHDRAW,
        amount: 2000,
        transactionDate: "2026-08-15",
      } as any);

      // fraction withdrawn = 2000/10850; proportional cost basis ≈ 10000 * (2000/10850) ≈ 1843.32
      expect(result.realizedGain).toBeCloseTo(2000 - (10000 * 2000) / 10850, 2);

      const update = prisma.investment.update.mock.calls[0][0].data;
      expect(update.quantity).toBe(0);
      expect(update.investedAmount).toBeCloseTo(10000 - (10000 * 2000) / 10850, 2);
    });

    it("rejects a withdrawal larger than the position's current value", async () => {
      const investment = buildInvestment({
        type: InvestmentType.RENDA_FIXA,
        quantity: new Prisma.Decimal(0) as any,
        investedAmount: new Prisma.Decimal(1000) as any,
        currentValue: new Prisma.Decimal(1000) as any,
      });

      await expect(
        service.create("user-1", investment, {
          type: InvestmentTransactionType.WITHDRAW,
          amount: 5000,
          transactionDate: "2026-08-15",
        } as any),
      ).rejects.toBeInstanceOf(InvestmentInsufficientQuantityException);
      expect(prisma.investmentTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("recalculates the investment by replaying the remaining transactions", async () => {
      prisma.investmentTransaction.findFirst.mockResolvedValue(
        buildTransaction({ investmentId: "inv-1" }),
      );
      prisma.investment.findUniqueOrThrow.mockResolvedValue(buildInvestment());
      prisma.investmentTransaction.findMany.mockResolvedValue([
        buildTransaction({
          type: InvestmentTransactionType.BUY,
          quantity: new Prisma.Decimal(50),
          amount: new Prisma.Decimal(5000),
          transactionDate: new Date("2026-08-01T00:00:00.000Z"),
        }),
      ]);

      await service.remove("user-1", "tx-1");

      expect(prisma.investmentTransaction.delete).toHaveBeenCalledWith({
        where: { id: "tx-1" },
      });
      const update = prisma.investment.update.mock.calls[0][0].data;
      expect(update.quantity).toBe(50);
      expect(update.investedAmount).toBe(5000);
      expect(update.averagePrice).toBe(100);
    });
  });
});
