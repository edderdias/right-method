import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuditEvent } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { getRequestMetadata } from "../../common/utils/request-metadata";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { AppConfigService } from "../../config/app-config.service";
import { AuditLogService } from "../audit/audit-log.service";
import { OpenFinanceWebhookUnauthorizedException } from "../../common/exceptions/app.exception";
import { OpenFinanceAccountsService } from "./services/open-finance-accounts.service";
import { OpenFinanceConnectionsService } from "./services/open-finance-connections.service";
import { OpenFinanceSyncService } from "./services/open-finance-sync.service";
import { OpenFinanceTransactionsService } from "./services/open-finance-transactions.service";
import { OpenFinanceCreditCardsService } from "./services/open-finance-credit-cards.service";
import { CreateConnectTokenDto } from "./dto/create-connect-token.dto";
import { CreateConnectionDto } from "./dto/create-connection.dto";
import { SelectAccountsDto } from "./dto/select-accounts.dto";
import { DisconnectAccountQueryDto } from "./dto/disconnect-account-query.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { ListOpenFinanceCreditCardsQueryDto } from "./dto/list-credit-cards-query.dto";
import { AddOpenFinanceCreditCardDto } from "./dto/add-credit-card.dto";

interface PluggyWebhookPayload {
  event: string;
  itemId?: string;
}

@ApiTags("open-finance")
@Controller("open-finance")
export class OpenFinanceController {
  private readonly logger = new Logger(OpenFinanceController.name);

  constructor(
    private readonly connectionsService: OpenFinanceConnectionsService,
    private readonly accountsService: OpenFinanceAccountsService,
    private readonly transactionsService: OpenFinanceTransactionsService,
    private readonly syncService: OpenFinanceSyncService,
    private readonly creditCardsService: OpenFinanceCreditCardsService,
    private readonly auditLogService: AuditLogService,
    private readonly config: AppConfigService,
  ) {}

  @ApiBearerAuth()
  @Post("connect-token")
  @ApiOperation({ summary: "Cria um connect_token para abrir o widget do Pluggy Connect" })
  async createConnectToken(@CurrentUser() user: JwtPayload, @Body() dto: CreateConnectTokenDto) {
    const accessToken = await this.connectionsService.createConnectToken(user.sub, dto.itemId);
    return { message: "Connect token criado.", data: { accessToken } };
  }

  @ApiBearerAuth()
  @Post("connections")
  @ApiOperation({ summary: "Registra a conexão criada pelo widget e lista as contas disponíveis" })
  async createConnection(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateConnectionDto,
    @Req() req: Request,
  ) {
    const data = await this.connectionsService.registerConnection(user.sub, dto.itemId);
    await this.auditLogService.record(
      AuditEvent.OPEN_FINANCE_CONNECTION_CREATED,
      getRequestMetadata(req),
      user.sub,
    );
    return { message: "Conexão registrada.", data };
  }

  @ApiBearerAuth()
  @Get("connections")
  @ApiOperation({ summary: "Lista as conexões (autorizações) do usuário" })
  async listConnections(@CurrentUser() user: JwtPayload) {
    const data = await this.connectionsService.listForUser(user.sub);
    return { message: "Conexões Open Finance.", data };
  }

  @ApiBearerAuth()
  @Post("connections/:id/accounts")
  @ApiOperation({ summary: "Importa as contas selecionadas pelo usuário para uma conexão" })
  async selectAccounts(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: SelectAccountsDto,
    @Req() req: Request,
  ) {
    await this.connectionsService.selectAccounts(
      user.sub,
      id,
      dto.externalAccountIds,
      getRequestMetadata(req),
    );
    const data = await this.accountsService.listForUser(user.sub);
    return { message: "Contas importadas com sucesso.", data };
  }

  @ApiBearerAuth()
  @Delete("connections/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Desconecta uma conexão inteira (todas as contas do banco)" })
  async disconnectConnection(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    await this.connectionsService.disconnectConnection(user.sub, id, getRequestMetadata(req));
    return { message: "Conexão desconectada." };
  }

  @ApiBearerAuth()
  @Get("accounts")
  @ApiOperation({ summary: "Lista as contas conectadas do usuário" })
  async listAccounts(@CurrentUser() user: JwtPayload) {
    const data = await this.accountsService.listForUser(user.sub);
    return { message: "Contas conectadas.", data };
  }

  @ApiBearerAuth()
  @Get("accounts/:id")
  @ApiOperation({ summary: "Consulta uma conta conectada" })
  async getAccount(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.accountsService.getOwned(user.sub, id);
    return { message: "Conta conectada.", data };
  }

  @ApiBearerAuth()
  @Post("accounts/:id/sync")
  @ApiOperation({ summary: "Sincroniza manualmente uma conta conectada" })
  async syncAccount(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Req() req: Request) {
    await this.accountsService.assertOwnership(user.sub, id);
    const result = await this.syncService.syncAccount(id);
    await this.auditLogService.record(
      AuditEvent.OPEN_FINANCE_SYNC_COMPLETED,
      getRequestMetadata(req),
      user.sub,
    );
    const data = await this.accountsService.getOwned(user.sub, id);
    return {
      message: `Sincronização concluída. ${result.importedCount} movimentações processadas.`,
      data,
    };
  }

  @ApiBearerAuth()
  @Delete("accounts/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Desconecta uma conta específica" })
  async disconnectAccount(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query() query: DisconnectAccountQueryDto,
    @Req() req: Request,
  ) {
    await this.accountsService.disconnect(
      user.sub,
      id,
      query.keepHistory ?? true,
      getRequestMetadata(req),
    );
    return { message: "Conta desconectada." };
  }

  @ApiBearerAuth()
  @Get("accounts/:id/transactions")
  @ApiOperation({ summary: "Extrato paginado e filtrado de uma conta conectada" })
  async listTransactions(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query() query: ListTransactionsQueryDto,
  ) {
    const data = await this.transactionsService.listForAccount(user.sub, id, query);
    return { message: "Extrato.", data };
  }

  @ApiBearerAuth()
  @Get("transactions/:id")
  @ApiOperation({ summary: "Consulta o detalhe de uma movimentação" })
  async getTransaction(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.transactionsService.findOne(user.sub, id);
    return { message: "Movimentação.", data };
  }

  @ApiBearerAuth()
  @Patch("transactions/:id")
  @ApiOperation({ summary: "Atualiza categoria/observações de uma movimentação" })
  async updateTransaction(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const data = await this.transactionsService.update(user.sub, id, dto);
    return { message: "Movimentação atualizada.", data };
  }

  @ApiBearerAuth()
  @Get("credit-cards")
  @ApiOperation({
    summary: "Lista cartões de crédito disponíveis numa conexão, ainda não importados",
  })
  async listAvailableCreditCards(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListOpenFinanceCreditCardsQueryDto,
  ) {
    const data = await this.creditCardsService.listAvailable(user.sub, query.connectionId);
    return { message: "Cartões disponíveis via Open Finance.", data };
  }

  @ApiBearerAuth()
  @Post("credit-cards")
  @ApiOperation({ summary: "Importa um cartão de crédito disponível numa conexão" })
  async addCreditCard(@CurrentUser() user: JwtPayload, @Body() dto: AddOpenFinanceCreditCardDto) {
    const data = await this.creditCardsService.addCard(
      user.sub,
      dto.connectionId,
      dto.externalCardId,
    );
    return { message: "Cartão adicionado ao Método Certo.", data };
  }

  @ApiBearerAuth()
  @Post("credit-cards/:id/sync")
  @ApiOperation({ summary: "Sincroniza manualmente um cartão de crédito conectado" })
  async syncCreditCard(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const result = await this.creditCardsService.syncCard(user.sub, id);
    return {
      message: `Sincronização concluída. ${result.importedCount} lançamentos processados.`,
    };
  }

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Recebe eventos do Pluggy (item/*, transactions/*)" })
  async handleWebhook(@Query("token") token: string, @Body() payload: PluggyWebhookPayload) {
    if (token !== this.config.get("PLUGGY_WEBHOOK_SECRET")) {
      throw new OpenFinanceWebhookUnauthorizedException();
    }

    await this.auditLogService.record(AuditEvent.OPEN_FINANCE_WEBHOOK_RECEIVED, {
      ipAddress: "pluggy-webhook",
      userAgent: payload.event,
    });

    if (!payload.itemId) {
      return { message: "Evento ignorado (sem itemId)." };
    }

    try {
      if (payload.event.startsWith("item/")) {
        await this.connectionsService.syncItemStatus(payload.itemId);
      } else if (payload.event.startsWith("transactions/")) {
        await this.syncAccountsForItem(payload.itemId);
      }
    } catch (error) {
      this.logger.error(`Failed to process Pluggy webhook event ${payload.event}`, error as Error);
    }

    return { message: "Evento processado." };
  }

  private async syncAccountsForItem(providerItemId: string): Promise<void> {
    const connectionId = await this.connectionsService.syncItemStatus(providerItemId);
    if (!connectionId) return;

    const accountIds = await this.accountsService.listActiveIdsForConnection(connectionId);
    for (const accountId of accountIds) {
      await this.syncService.syncAccount(accountId).catch((error: unknown) => {
        this.logger.error(`Webhook-triggered sync failed for account ${accountId}`, error as Error);
      });
    }
  }
}
