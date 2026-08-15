import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ConfigModule } from "./config/config.module";
import { PrismaModule } from "./database/prisma.module";
import { RedisModule } from "./database/redis.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { RevenuesModule } from "./modules/revenues/revenues.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { OpenFinanceModule } from "./modules/open-finance/open-finance.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    AccountsModule,
    CategoriesModule,
    RevenuesModule,
    ExpensesModule,
    DashboardModule,
    OpenFinanceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
