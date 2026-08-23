import { InvestmentSource, InvestmentStatus, InvestmentType, Prisma } from "@prisma/client";
import {
  InvestmentArchivedException,
  InvestmentNotFoundException,
  InvestmentReadOnlyException,
} from "../../common/exceptions/app.exception";
import { InvestmentsService } from "./investments.service";

function createPrismaMock() {
  const prisma: any = {
    investment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    investmentTransaction: {
      count: jest.fn(),
    },
    investmentIncome: {
      count: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

function buildInvestment(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    userId: "user-1",
    connectionId: null,
    externalInvestmentId: null,
    type: InvestmentType.FIIS,
    ticker: "XPML11",
    name: "XP Malls",
    institutionName: "XP",
    quantity: new Prisma.Decimal(100),
    averagePrice: new Prisma.Decimal(103.5),
    investedAmount: new Prisma.Decimal(10350),
    currentValue: new Prisma.Decimal(10350),
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

describe("InvestmentsService", () => {
  let prisma: any;
  let service: InvestmentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new InvestmentsService(prisma);
  });

  describe("create", () => {
    it("creates a MANUAL/ACTIVE investment, defaulting currentValue to investedAmount", async () => {
      prisma.investment.create.mockImplementation(({ data }: any) =>
        Promise.resolve(buildInvestment({ ...data, currentValue: data.currentValue })),
      );

      const result = await service.create("user-1", {
        type: InvestmentType.RENDA_FIXA,
        name: "CDB Banco X",
        investedAmount: 20000,
      } as any);

      expect(prisma.investment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: InvestmentSource.MANUAL,
            status: InvestmentStatus.ACTIVE,
            investedAmount: 20000,
            currentValue: 20000,
          }),
        }),
      );
      expect(result.investedAmount).toBe(20000);
    });
  });

  describe("update", () => {
    it("rejects editing an OPEN_FINANCE investment", async () => {
      prisma.investment.findFirst.mockResolvedValue(
        buildInvestment({ source: InvestmentSource.OPEN_FINANCE }),
      );

      await expect(
        service.update("user-1", "inv-1", { name: "Novo nome" } as any),
      ).rejects.toBeInstanceOf(InvestmentReadOnlyException);
      expect(prisma.investment.update).not.toHaveBeenCalled();
    });

    it("throws when the investment does not belong to the user", async () => {
      prisma.investment.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "inv-x", { name: "Novo nome" } as any),
      ).rejects.toBeInstanceOf(InvestmentNotFoundException);
    });
  });

  describe("archiveOrDelete", () => {
    it("hard-deletes an investment with no transactions or incomes", async () => {
      prisma.investment.findFirst.mockResolvedValue(buildInvestment());
      prisma.investmentTransaction.count.mockResolvedValue(0);
      prisma.investmentIncome.count.mockResolvedValue(0);

      const result = await service.archiveOrDelete("user-1", "inv-1");

      expect(result.archived).toBe(false);
      expect(prisma.investment.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
      expect(prisma.investment.update).not.toHaveBeenCalled();
    });

    it("archives an investment that has transaction/income history instead of deleting it", async () => {
      prisma.investment.findFirst.mockResolvedValue(buildInvestment());
      prisma.investmentTransaction.count.mockResolvedValue(3);
      prisma.investmentIncome.count.mockResolvedValue(1);

      const result = await service.archiveOrDelete("user-1", "inv-1");

      expect(result.archived).toBe(true);
      expect(prisma.investment.delete).not.toHaveBeenCalled();
      expect(prisma.investment.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: InvestmentStatus.ARCHIVED },
      });
    });
  });

  describe("assertOwnedActiveInvestment", () => {
    it("rejects new transactions on an archived investment", async () => {
      prisma.investment.findFirst.mockResolvedValue(
        buildInvestment({ status: InvestmentStatus.ARCHIVED }),
      );

      await expect(
        service.assertOwnedActiveInvestment("user-1", "inv-1"),
      ).rejects.toBeInstanceOf(InvestmentArchivedException);
    });
  });

  describe("getSummary", () => {
    it("aggregates invested/current totals, return, and per-type breakdown across ACTIVE investments", async () => {
      prisma.investment.findMany.mockResolvedValue([
        buildInvestment({
          type: InvestmentType.FIIS,
          investedAmount: new Prisma.Decimal(10000),
          currentValue: new Prisma.Decimal(10800),
        }),
        buildInvestment({
          id: "inv-2",
          type: InvestmentType.RENDA_FIXA,
          investedAmount: new Prisma.Decimal(20000),
          currentValue: new Prisma.Decimal(20850),
        }),
      ]);
      prisma.investmentIncome.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(850) },
      });

      const summary = await service.getSummary("user-1");

      expect(summary.investmentCount).toBe(2);
      expect(summary.totalInvested).toBe(30000);
      expect(summary.totalCurrentValue).toBe(31650);
      expect(summary.totalReturn).toBe(1650);
      expect(summary.totalReturnPct).toBeCloseTo(5.5);
      expect(summary.totalIncome).toBe(850);
      expect(summary.byType).toEqual(
        expect.arrayContaining([
          { type: InvestmentType.FIIS, investedAmount: 10000, currentValue: 10800 },
          { type: InvestmentType.RENDA_FIXA, investedAmount: 20000, currentValue: 20850 },
        ]),
      );
    });

    it("returns zeroed totals when there are no investments", async () => {
      prisma.investment.findMany.mockResolvedValue([]);

      const summary = await service.getSummary("user-1");

      expect(summary).toEqual({
        investmentCount: 0,
        totalInvested: 0,
        totalCurrentValue: 0,
        totalReturn: 0,
        totalReturnPct: 0,
        totalIncome: 0,
        byType: [],
      });
    });
  });
});
