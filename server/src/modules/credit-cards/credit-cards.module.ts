import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { CategoriesModule } from "../categories/categories.module";
import { CreditCardsController } from "./credit-cards.controller";
import { CreditCardPurchasesController } from "./credit-card-purchases.controller";
import { CreditCardsService } from "./credit-cards.service";
import { CreditCardPurchasesService } from "./credit-card-purchases.service";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";

@Module({
  imports: [AccountsModule, CategoriesModule],
  controllers: [CreditCardsController, CreditCardPurchasesController],
  providers: [CreditCardsService, CreditCardPurchasesService, CreditCardInvoicesService],
  exports: [CreditCardsService],
})
export class CreditCardsModule {}
