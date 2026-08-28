import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { ReportsModule } from "../reports/reports.module";
import { CreditCardsModule } from "../credit-cards/credit-cards.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AccountsModule, ReportsModule, CreditCardsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
