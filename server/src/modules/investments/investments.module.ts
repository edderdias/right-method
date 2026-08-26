import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { InvestmentsController } from "./investments.controller";
import { InvestmentsService } from "./investments.service";
import { InvestmentTransactionsService } from "./investment-transactions.service";
import { InvestmentIncomesService } from "./investment-incomes.service";

@Module({
  imports: [NotificationsModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService, InvestmentTransactionsService, InvestmentIncomesService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
