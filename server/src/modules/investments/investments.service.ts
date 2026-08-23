import { Injectable } from "@nestjs/common";
import { Investment, InvestmentSource, InvestmentStatus, InvestmentType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  InvestmentArchivedException,
  InvestmentNotFoundException,
  InvestmentReadOnlyException,
} from "../../common/exceptions/app.exception";
import { parseDateOnly } from "../../common/utils/date-only";
import type { CreateInvestmentDto } from "./dto/create-investment.dto";
import type { UpdateInvestmentDto } from "./dto/update-investment.dto";

export type PublicInvestment = Omit<
  Investment,
  "quantity" | "averagePrice" | "investedAmount" | "currentValue" | "currentPrice"
> & {
  quantity: number;
  averagePrice: number | null;
  investedAmount: number;
  currentValue: number;
  currentPrice: number | null;
};

export interface InvestmentSummaryByType {
  type: InvestmentType;
  investedAmount: number;
  currentValue: number;
}

export interface InvestmentSummary {
  investmentCount: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  totalIncome: number;
  byType: InvestmentSummaryByType[];
}

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInvestmentDto): Promise<PublicInvestment> {
    const investedAmount = dto.investedAmount ?? 0;
    const investment = await this.prisma.investment.create({
      data: {
        userId,
        type: dto.type,
        ticker: dto.ticker,
        name: dto.name,
        institutionName: dto.institutionName,
        quantity: dto.quantity ?? 0,
        averagePrice: dto.averagePrice ?? null,
        investedAmount,
        currentValue: dto.currentValue ?? investedAmount,
        currentPrice: dto.currentPrice ?? null,
        issuer: dto.issuer,
        rate: dto.rate,
        indexer: dto.indexer,
        maturityDate: dto.maturityDate ? parseDateOnly(dto.maturityDate) : null,
        liquidity: dto.liquidity,
        notes: dto.notes,
        source: InvestmentSource.MANUAL,
        status: InvestmentStatus.ACTIVE,
      },
    });
    return this.toPublic(investment);
  }

  async list(userId: string): Promise<PublicInvestment[]> {
    const investments = await this.prisma.investment.findMany({
      where: { userId, status: InvestmentStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
    });
    return investments.map((investment) => this.toPublic(investment));
  }

  async findOne(userId: string, id: string): Promise<PublicInvestment> {
    return this.toPublic(await this.assertOwnership(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto): Promise<PublicInvestment> {
    const existing = await this.assertOwnership(userId, id);
    if (existing.source === InvestmentSource.OPEN_FINANCE) {
      throw new InvestmentReadOnlyException();
    }

    const data: Prisma.InvestmentUncheckedUpdateInput = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.ticker !== undefined) data.ticker = dto.ticker;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.institutionName !== undefined) data.institutionName = dto.institutionName;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.averagePrice !== undefined) data.averagePrice = dto.averagePrice;
    if (dto.investedAmount !== undefined) data.investedAmount = dto.investedAmount;
    if (dto.currentValue !== undefined) data.currentValue = dto.currentValue;
    if (dto.currentPrice !== undefined) data.currentPrice = dto.currentPrice;
    if (dto.issuer !== undefined) data.issuer = dto.issuer;
    if (dto.rate !== undefined) data.rate = dto.rate;
    if (dto.indexer !== undefined) data.indexer = dto.indexer;
    if (dto.maturityDate !== undefined) {
      data.maturityDate = dto.maturityDate ? parseDateOnly(dto.maturityDate) : null;
    }
    if (dto.liquidity !== undefined) data.liquidity = dto.liquidity;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.investment.update({ where: { id }, data });
    return this.toPublic(updated);
  }

  /** Prefers archiving over deletion whenever the investment has history: hard-deletes only an
   * empty investment, otherwise flips it to ARCHIVED so transactions/incomes stay queryable. */
  async archiveOrDelete(userId: string, id: string): Promise<{ archived: boolean }> {
    await this.assertOwnership(userId, id);

    const [transactionCount, incomeCount] = await Promise.all([
      this.prisma.investmentTransaction.count({ where: { investmentId: id } }),
      this.prisma.investmentIncome.count({ where: { investmentId: id } }),
    ]);

    if (transactionCount === 0 && incomeCount === 0) {
      await this.prisma.investment.delete({ where: { id } });
      return { archived: false };
    }

    await this.prisma.investment.update({
      where: { id },
      data: { status: InvestmentStatus.ARCHIVED },
    });
    return { archived: true };
  }

  /** Rentabilidade is the simple (currentValue - investedAmount) / investedAmount formula — a
   * known simplification for the MVP, not a TWR/XIRR-correct return that properly weights the
   * timing of contributions and withdrawals. Refining this is future work. */
  async getSummary(userId: string): Promise<InvestmentSummary> {
    const investments = await this.prisma.investment.findMany({
      where: { userId, status: InvestmentStatus.ACTIVE },
    });

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const byTypeMap = new Map<InvestmentType, { investedAmount: number; currentValue: number }>();

    for (const investment of investments) {
      const invested = Number(investment.investedAmount);
      const current = Number(investment.currentValue);
      totalInvested += invested;
      totalCurrentValue += current;

      const bucket = byTypeMap.get(investment.type) ?? { investedAmount: 0, currentValue: 0 };
      bucket.investedAmount += invested;
      bucket.currentValue += current;
      byTypeMap.set(investment.type, bucket);
    }

    const incomeAgg = await this.prisma.investmentIncome.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const totalReturn = totalCurrentValue - totalInvested;

    return {
      investmentCount: investments.length,
      totalInvested,
      totalCurrentValue,
      totalReturn,
      totalReturnPct: totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0,
      totalIncome: Number(incomeAgg._sum.amount ?? 0),
      byType: Array.from(byTypeMap.entries()).map(([type, values]) => ({ type, ...values })),
    };
  }

  async assertOwnership(userId: string, id: string): Promise<Investment> {
    const investment = await this.prisma.investment.findFirst({ where: { id, userId } });
    if (!investment) {
      throw new InvestmentNotFoundException();
    }
    return investment;
  }

  async assertOwnedActiveInvestment(userId: string, id: string): Promise<Investment> {
    const investment = await this.assertOwnership(userId, id);
    if (investment.status === InvestmentStatus.ARCHIVED) {
      throw new InvestmentArchivedException();
    }
    return investment;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(investment: Investment): PublicInvestment {
    return {
      ...investment,
      quantity: Number(investment.quantity),
      averagePrice: investment.averagePrice !== null ? Number(investment.averagePrice) : null,
      investedAmount: Number(investment.investedAmount),
      currentValue: Number(investment.currentValue),
      currentPrice: investment.currentPrice !== null ? Number(investment.currentPrice) : null,
    };
  }
}
