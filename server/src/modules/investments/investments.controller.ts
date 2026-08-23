import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { InvestmentsService } from "./investments.service";
import { InvestmentTransactionsService } from "./investment-transactions.service";
import { InvestmentIncomesService } from "./investment-incomes.service";
import { CreateInvestmentDto } from "./dto/create-investment.dto";
import { UpdateInvestmentDto } from "./dto/update-investment.dto";
import { CreateInvestmentTransactionDto } from "./dto/create-investment-transaction.dto";
import { CreateInvestmentIncomeDto } from "./dto/create-investment-income.dto";

@ApiTags("investments")
@ApiBearerAuth()
@Controller("investments")
export class InvestmentsController {
  constructor(
    private readonly investmentsService: InvestmentsService,
    private readonly transactionsService: InvestmentTransactionsService,
    private readonly incomesService: InvestmentIncomesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lista os investimentos ativos do usuário" })
  async list(@CurrentUser() user: JwtPayload) {
    const data = await this.investmentsService.list(user.sub);
    return { message: "Investimentos.", data };
  }

  @Get("summary")
  @ApiOperation({ summary: "Resumo da carteira: total investido, valor atual e alocação por tipo" })
  async summary(@CurrentUser() user: JwtPayload) {
    const data = await this.investmentsService.getSummary(user.sub);
    return { message: "Resumo da carteira.", data };
  }

  @Post()
  @ApiOperation({ summary: "Cadastra um investimento manual" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInvestmentDto) {
    const data = await this.investmentsService.create(user.sub, dto);
    return { message: "Investimento cadastrado com sucesso.", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulta um investimento" })
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.investmentsService.findOne(user.sub, id);
    return { message: "Investimento.", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza um investimento manual" })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    const data = await this.investmentsService.update(user.sub, id, dto);
    return { message: "Investimento atualizado com sucesso.", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui (ou arquiva, se houver histórico) um investimento" })
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const result = await this.investmentsService.archiveOrDelete(user.sub, id);
    return {
      message: result.archived
        ? "Investimento arquivado — o histórico de lançamentos foi preservado."
        : "Investimento excluído com sucesso.",
    };
  }

  @Get(":id/transactions")
  @ApiOperation({ summary: "Lista os lançamentos (aportes, resgates) de um investimento" })
  async listTransactions(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.investmentsService.assertOwnership(user.sub, id);
    const data = await this.transactionsService.list(user.sub, id);
    return { message: "Lançamentos.", data };
  }

  @Post(":id/transactions")
  @ApiOperation({ summary: "Registra um aporte, resgate, compra ou venda manual" })
  async createTransaction(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateInvestmentTransactionDto,
  ) {
    const investment = await this.investmentsService.assertOwnedActiveInvestment(user.sub, id);
    const data = await this.transactionsService.create(user.sub, investment, dto);
    return { message: "Lançamento registrado com sucesso.", data };
  }

  @Delete(":id/transactions/:transactionId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui um lançamento e recalcula a posição do investimento" })
  async removeTransaction(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("transactionId") transactionId: string,
  ) {
    await this.investmentsService.assertOwnership(user.sub, id);
    await this.transactionsService.remove(user.sub, transactionId);
    return { message: "Lançamento excluído com sucesso." };
  }

  @Get(":id/incomes")
  @ApiOperation({ summary: "Lista os rendimentos (dividendos, juros...) de um investimento" })
  async listIncomes(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.investmentsService.assertOwnership(user.sub, id);
    const data = await this.incomesService.list(user.sub, id);
    return { message: "Rendimentos.", data };
  }

  @Post(":id/incomes")
  @ApiOperation({ summary: "Registra um rendimento manual" })
  async createIncome(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateInvestmentIncomeDto,
  ) {
    const investment = await this.investmentsService.assertOwnedActiveInvestment(user.sub, id);
    const data = await this.incomesService.create(user.sub, investment, dto);
    return { message: "Rendimento registrado com sucesso.", data };
  }

  @Delete(":id/incomes/:incomeId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui um rendimento" })
  async removeIncome(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("incomeId") incomeId: string,
  ) {
    await this.investmentsService.assertOwnership(user.sub, id);
    await this.incomesService.remove(user.sub, incomeId);
    return { message: "Rendimento excluído com sucesso." };
  }
}
