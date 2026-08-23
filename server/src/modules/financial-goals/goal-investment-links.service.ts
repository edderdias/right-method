import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { InvestmentsService } from "../investments/investments.service";
import {
  GoalInvestmentAlreadyLinkedException,
  GoalInvestmentLinkNotFoundException,
} from "../../common/exceptions/app.exception";
import type { LinkedInvestmentSummary } from "./financial-goals.service";

@Injectable()
export class GoalInvestmentLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly investmentsService: InvestmentsService,
  ) {}

  async list(goalId: string): Promise<LinkedInvestmentSummary[]> {
    const links = await this.prisma.goalInvestmentLink.findMany({
      where: { goalId },
      include: { investment: { select: { id: true, name: true, currentValue: true } } },
    });
    return links.map((link) => ({
      id: link.id,
      investmentId: link.investmentId,
      name: link.investment.name,
      currentValue: Number(link.investment.currentValue),
    }));
  }

  async link(userId: string, goalId: string, investmentId: string): Promise<LinkedInvestmentSummary> {
    const investment = await this.investmentsService.assertOwnership(userId, investmentId);

    const existing = await this.prisma.goalInvestmentLink.findUnique({
      where: { goalId_investmentId: { goalId, investmentId } },
    });
    if (existing) {
      throw new GoalInvestmentAlreadyLinkedException();
    }

    const link = await this.prisma.goalInvestmentLink.create({ data: { goalId, investmentId } });
    return {
      id: link.id,
      investmentId: investment.id,
      name: investment.name,
      currentValue: Number(investment.currentValue),
    };
  }

  async unlink(goalId: string, investmentId: string): Promise<void> {
    const existing = await this.prisma.goalInvestmentLink.findUnique({
      where: { goalId_investmentId: { goalId, investmentId } },
    });
    if (!existing) {
      throw new GoalInvestmentLinkNotFoundException();
    }
    await this.prisma.goalInvestmentLink.delete({ where: { id: existing.id } });
  }
}
