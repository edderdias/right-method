import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { CategoriesModule } from "../categories/categories.module";
import { RevenuesController } from "./revenues.controller";
import { RevenuesService } from "./revenues.service";

@Module({
  imports: [AccountsModule, CategoriesModule],
  controllers: [RevenuesController],
  providers: [RevenuesService],
  exports: [RevenuesService],
})
export class RevenuesModule {}
