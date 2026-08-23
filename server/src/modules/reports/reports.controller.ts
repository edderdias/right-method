import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { ReportsService } from "./reports.service";
import { ReportsQueryDto } from "./dto/reports-query.dto";
import { TopExpensesQueryDto } from "./dto/top-expenses-query.dto";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("summary")
  @ApiOperation({ summary: "Resumo financeiro do período, com comparação ao período anterior" })
  async summary(@CurrentUser() user: JwtPayload, @Query() query: ReportsQueryDto) {
    const period = this.reportsService.resolvePeriod(query);
    const data = await this.reportsService.getSummary(user.sub, period, query.accountId);
    return { message: "Resumo do relatório.", data };
  }

  @Get("cash-flow")
  @ApiOperation({
    summary: "Fluxo de caixa do período: saldo inicial, receitas, despesas e saldo final",
  })
  async cashFlow(@CurrentUser() user: JwtPayload, @Query() query: ReportsQueryDto) {
    const period = this.reportsService.resolvePeriod(query);
    const data = await this.reportsService.getCashFlow(user.sub, period, query.accountId);
    return { message: "Fluxo de caixa.", data };
  }

  @Get("expenses-by-category")
  @ApiOperation({ summary: "Despesas pagas por categoria, com percentual e quantidade" })
  async expensesByCategory(@CurrentUser() user: JwtPayload, @Query() query: ReportsQueryDto) {
    const period = this.reportsService.resolvePeriod(query);
    const data = await this.reportsService.getExpensesByCategory(
      user.sub,
      period,
      query.accountId,
      query.categoryId,
    );
    return { message: "Despesas por categoria.", data };
  }

  @Get("top-expenses")
  @ApiOperation({ summary: "Maiores despesas pagas no período" })
  async topExpenses(@CurrentUser() user: JwtPayload, @Query() query: TopExpensesQueryDto) {
    const period = this.reportsService.resolvePeriod(query);
    const data = await this.reportsService.getTopExpenses(
      user.sub,
      period,
      query.limit ?? 10,
      query.accountId,
      query.categoryId,
    );
    return { message: "Maiores despesas.", data };
  }
}
