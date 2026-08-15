import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { OpenFinanceController } from "./open-finance.controller";
import { PluggyClientService } from "./services/pluggy-client.service";
import { TransactionCategorizerService } from "./services/transaction-categorizer.service";
import { OpenFinanceSyncService } from "./services/open-finance-sync.service";
import { OpenFinanceConnectionsService } from "./services/open-finance-connections.service";
import { OpenFinanceAccountsService } from "./services/open-finance-accounts.service";
import { OpenFinanceTransactionsService } from "./services/open-finance-transactions.service";

@Module({
  imports: [AuditModule],
  controllers: [OpenFinanceController],
  providers: [
    PluggyClientService,
    TransactionCategorizerService,
    OpenFinanceSyncService,
    OpenFinanceConnectionsService,
    OpenFinanceAccountsService,
    OpenFinanceTransactionsService,
  ],
  exports: [OpenFinanceAccountsService],
})
export class OpenFinanceModule {}
