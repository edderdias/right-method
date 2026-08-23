import { Module } from "@nestjs/common";
import { InvestmentsModule } from "../investments/investments.module";
import { FinancialGoalsController } from "./financial-goals.controller";
import { FinancialGoalsService } from "./financial-goals.service";
import { GoalTransactionsService } from "./goal-transactions.service";
import { GoalInvestmentLinksService } from "./goal-investment-links.service";

@Module({
  imports: [InvestmentsModule],
  controllers: [FinancialGoalsController],
  providers: [FinancialGoalsService, GoalTransactionsService, GoalInvestmentLinksService],
  exports: [FinancialGoalsService],
})
export class FinancialGoalsModule {}
