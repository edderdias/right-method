import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { FinancialGoalsService } from "./financial-goals.service";
import { GoalTransactionsService } from "./goal-transactions.service";
import { GoalInvestmentLinksService } from "./goal-investment-links.service";
import { CreateFinancialGoalDto } from "./dto/create-financial-goal.dto";
import { UpdateFinancialGoalDto } from "./dto/update-financial-goal.dto";
import { CreateGoalTransactionDto } from "./dto/create-goal-transaction.dto";
import { LinkGoalInvestmentDto } from "./dto/link-goal-investment.dto";

@ApiTags("goals")
@ApiBearerAuth()
@Controller("goals")
export class FinancialGoalsController {
  constructor(
    private readonly goalsService: FinancialGoalsService,
    private readonly transactionsService: GoalTransactionsService,
    private readonly investmentLinksService: GoalInvestmentLinksService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lista as metas financeiras do usuário" })
  async list(@CurrentUser() user: JwtPayload) {
    const data = await this.goalsService.list(user.sub);
    return { message: "Metas financeiras.", data };
  }

  @Get("summary")
  @ApiOperation({ summary: "Resumo das metas: total, acumulado e progresso geral" })
  async summary(@CurrentUser() user: JwtPayload) {
    const data = await this.goalsService.getSummary(user.sub);
    return { message: "Resumo das metas.", data };
  }

  @Post()
  @ApiOperation({ summary: "Cria uma meta financeira" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateFinancialGoalDto) {
    const data = await this.goalsService.create(user.sub, dto);
    return { message: "Meta criada com sucesso.", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulta o detalhe de uma meta, com progresso e projeção" })
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.goalsService.findOne(user.sub, id);
    return { message: "Meta.", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza uma meta (inclui pausar/reativar/arquivar via status)" })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateFinancialGoalDto,
  ) {
    const data = await this.goalsService.update(user.sub, id, dto);
    return { message: "Meta atualizada com sucesso.", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui (ou arquiva, se houver histórico) uma meta" })
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const result = await this.goalsService.archiveOrDelete(user.sub, id);
    return {
      message: result.archived
        ? "Meta arquivada — o histórico de aportes e retiradas foi preservado."
        : "Meta excluída com sucesso.",
    };
  }

  @Get(":id/transactions")
  @ApiOperation({ summary: "Lista os aportes e retiradas de uma meta" })
  async listTransactions(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.goalsService.assertOwnership(user.sub, id);
    const data = await this.transactionsService.list(user.sub, id);
    return { message: "Lançamentos.", data };
  }

  @Post(":id/transactions")
  @ApiOperation({ summary: "Registra um aporte ou retirada na meta" })
  async createTransaction(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateGoalTransactionDto,
  ) {
    const goal = await this.goalsService.assertOwnedActiveGoal(user.sub, id);
    const data = await this.transactionsService.create(user.sub, goal, dto);
    return { message: "Lançamento registrado com sucesso.", data };
  }

  @Delete(":id/transactions/:transactionId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui um lançamento e recalcula o saldo da meta" })
  async removeTransaction(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("transactionId") transactionId: string,
  ) {
    await this.goalsService.assertOwnership(user.sub, id);
    await this.transactionsService.remove(user.sub, transactionId);
    return { message: "Lançamento excluído com sucesso." };
  }

  @Post(":id/investments")
  @ApiOperation({ summary: "Vincula um investimento à meta (informativo, não altera o saldo)" })
  async linkInvestment(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: LinkGoalInvestmentDto,
  ) {
    await this.goalsService.assertOwnership(user.sub, id);
    const data = await this.investmentLinksService.link(user.sub, id, dto.investmentId);
    return { message: "Investimento vinculado à meta.", data };
  }

  @Delete(":id/investments/:investmentId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove o vínculo entre a meta e um investimento" })
  async unlinkInvestment(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("investmentId") investmentId: string,
  ) {
    await this.goalsService.assertOwnership(user.sub, id);
    await this.investmentLinksService.unlink(id, investmentId);
    return { message: "Vínculo removido." };
  }
}
