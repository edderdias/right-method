import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { AccountsService } from "./accounts.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { TransferDto } from "./dto/transfer.dto";
import { AccountsSummaryQueryDto } from "./dto/accounts-summary-query.dto";

@ApiTags("accounts")
@ApiBearerAuth()
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: "Lista as contas do usuário autenticado" })
  async list(@CurrentUser() user: JwtPayload) {
    const data = await this.accountsService.listForUser(user.sub);
    return { message: "Contas do usuário.", data };
  }

  @Get("summary")
  @ApiOperation({ summary: "Saldo, recebido e gasto por conta no período" })
  async summary(@CurrentUser() user: JwtPayload, @Query() query: AccountsSummaryQueryDto) {
    const data = await this.accountsService.getPeriodSummary(user.sub, query);
    return { message: "Resumo por conta.", data };
  }

  @Get("transfers")
  @ApiOperation({ summary: "Histórico de transferências entre contas" })
  async listTransfers(@CurrentUser() user: JwtPayload) {
    const data = await this.accountsService.listTransfers(user.sub);
    return { message: "Transferências.", data };
  }

  @Post()
  @ApiOperation({ summary: "Cria uma conta para o usuário autenticado" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountDto) {
    const data = await this.accountsService.create(user.sub, dto);
    return { message: "Conta criada com sucesso.", data };
  }

  @Post("transfer")
  @ApiOperation({ summary: "Transfere um valor entre duas contas do usuário" })
  async transfer(@CurrentUser() user: JwtPayload, @Body() dto: TransferDto) {
    const data = await this.accountsService.transfer(user.sub, dto);
    return { message: "Transferência realizada com sucesso.", data };
  }

  @Delete("transfers/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Estorna e exclui uma transferência entre contas" })
  async removeTransfer(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.accountsService.removeTransfer(user.sub, id);
    return { message: "Transferência estornada com sucesso." };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza o nome e/ou o saldo de uma conta" })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const data = await this.accountsService.update(user.sub, id, dto);
    return { message: "Conta atualizada com sucesso.", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui uma conta sem lançamentos vinculados" })
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.accountsService.remove(user.sub, id);
    return { message: "Conta excluída com sucesso." };
  }
}
