import { Injectable } from "@nestjs/common";
import { Investment, InvestmentIncome } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { InvestmentIncomeNotFoundException } from "../../common/exceptions/app.exception";
import { parseDateOnly } from "../../common/utils/date-only";
import { NotificationsService } from "../notifications/notifications.service";
import type { CreateInvestmentIncomeDto } from "./dto/create-investment-income.dto";

export type PublicInvestmentIncome = Omit<InvestmentIncome, "amount"> & { amount: number };

@Injectable()
export class InvestmentIncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Pure record-keeping — rendimentos are cash received and never touch quantity/investedAmount,
   * which are reserved for capital movements (see InvestmentTransactionsService). */
  async create(
    userId: string,
    investment: Investment,
    dto: CreateInvestmentIncomeDto,
  ): Promise<PublicInvestmentIncome> {
    const income = await this.prisma.investmentIncome.create({
      data: {
        userId,
        investmentId: investment.id,
        type: dto.type,
        amount: dto.amount,
        paymentDate: parseDateOnly(dto.paymentDate),
        notes: dto.notes,
      },
    });

    await this.notifications.create({
      userId,
      type: "INVESTMENT_INCOME",
      title: "Rendimento recebido",
      body: `${investment.name} — ${dto.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} recebidos.`,
      link: "/investimentos",
      entityId: income.id,
    });

    return this.toPublic(income);
  }

  async list(userId: string, investmentId: string): Promise<PublicInvestmentIncome[]> {
    const incomes = await this.prisma.investmentIncome.findMany({
      where: { userId, investmentId },
      orderBy: { paymentDate: "desc" },
    });
    return incomes.map((income) => this.toPublic(income));
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwnership(userId, id);
    await this.prisma.investmentIncome.delete({ where: { id } });
  }

  async assertOwnership(userId: string, id: string): Promise<InvestmentIncome> {
    const income = await this.prisma.investmentIncome.findFirst({ where: { id, userId } });
    if (!income) {
      throw new InvestmentIncomeNotFoundException();
    }
    return income;
  }

  /** Prisma's Decimal fields serialize to strings via toJSON() — convert to numbers for API responses. */
  private toPublic(income: InvestmentIncome): PublicInvestmentIncome {
    return { ...income, amount: Number(income.amount) };
  }
}
