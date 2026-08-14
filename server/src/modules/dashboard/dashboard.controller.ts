import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { DashboardService } from "./dashboard.service";
import { DashboardPeriodQueryDto } from "./dto/dashboard-period-query.dto";
import { RevenuesEvolutionQueryDto } from "./dto/revenues-evolution-query.dto";
import { ExpensesEvolutionQueryDto } from "./dto/expenses-evolution-query.dto";

@ApiTags("dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @ApiOperation({ summary: "Indicadores financeiros do período selecionado" })
  async summary(@CurrentUser() user: JwtPayload, @Query() query: DashboardPeriodQueryDto) {
    const period = this.dashboardService.resolvePeriod(query);
    const data = await this.dashboardService.getSummary(user.sub, period);
    return { message: "Resumo do dashboard.", data };
  }

  @Get("revenues-evolution")
  @ApiOperation({ summary: "Evolução mensal das receitas recebidas" })
  async revenuesEvolution(
    @CurrentUser() user: JwtPayload,
    @Query() query: RevenuesEvolutionQueryDto,
  ) {
    const data = await this.dashboardService.getRevenuesEvolution(user.sub, query.months ?? 6);
    return { message: "Evolução das receitas.", data };
  }

  @Get("revenues-by-category")
  @ApiOperation({ summary: "Receitas recebidas agrupadas por categoria no período" })
  async revenuesByCategory(
    @CurrentUser() user: JwtPayload,
    @Query() query: DashboardPeriodQueryDto,
  ) {
    const period = this.dashboardService.resolvePeriod(query);
    const data = await this.dashboardService.getRevenuesByCategory(user.sub, period);
    return { message: "Receitas por categoria.", data };
  }

  @Get("expenses-evolution")
  @ApiOperation({ summary: "Evolução mensal das despesas pagas" })
  async expensesEvolution(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExpensesEvolutionQueryDto,
  ) {
    const data = await this.dashboardService.getExpensesEvolution(user.sub, query.months ?? 6);
    return { message: "Evolução das despesas.", data };
  }

  @Get("expenses-by-category")
  @ApiOperation({ summary: "Despesas pagas agrupadas por categoria no período" })
  async expensesByCategory(
    @CurrentUser() user: JwtPayload,
    @Query() query: DashboardPeriodQueryDto,
  ) {
    const period = this.dashboardService.resolvePeriod(query);
    const data = await this.dashboardService.getExpensesByCategory(user.sub, period);
    return { message: "Despesas por categoria.", data };
  }
}
