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
import { CreditCardsService } from "./credit-cards.service";
import { CreditCardPurchasesService } from "./credit-card-purchases.service";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";
import { CreateCreditCardDto } from "./dto/create-credit-card.dto";
import { UpdateCreditCardDto } from "./dto/update-credit-card.dto";
import { CreateCreditCardPurchaseDto } from "./dto/create-credit-card-purchase.dto";
import { ListCreditCardPurchasesQueryDto } from "./dto/list-credit-card-purchases-query.dto";
import { PayInvoiceDto } from "./dto/pay-invoice.dto";

@ApiTags("credit-cards")
@ApiBearerAuth()
@Controller("credit-cards")
export class CreditCardsController {
  constructor(
    private readonly creditCardsService: CreditCardsService,
    private readonly purchasesService: CreditCardPurchasesService,
    private readonly invoicesService: CreditCardInvoicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lista os cartões ativos do usuário" })
  async list(@CurrentUser() user: JwtPayload) {
    const data = await this.creditCardsService.list(user.sub);
    return { message: "Cartões.", data };
  }

  @Get("summary")
  @ApiOperation({ summary: "Resumo de limite e faturas em aberto de todos os cartões" })
  async summary(@CurrentUser() user: JwtPayload) {
    const data = await this.creditCardsService.getSummary(user.sub);
    return { message: "Resumo de cartões.", data };
  }

  @Post()
  @ApiOperation({ summary: "Cadastra um cartão manual" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCreditCardDto) {
    const data = await this.creditCardsService.create(user.sub, dto);
    return { message: "Cartão cadastrado com sucesso.", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulta um cartão" })
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.creditCardsService.findOne(user.sub, id);
    return { message: "Cartão.", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza um cartão manual" })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateCreditCardDto,
  ) {
    const data = await this.creditCardsService.update(user.sub, id, dto);
    return { message: "Cartão atualizado com sucesso.", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui (ou arquiva, se houver histórico) um cartão" })
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const result = await this.creditCardsService.archiveOrDelete(user.sub, id);
    return {
      message: result.archived
        ? "Cartão arquivado — o histórico de faturas e compras foi preservado."
        : "Cartão excluído com sucesso.",
    };
  }

  @Get(":id/purchases")
  @ApiOperation({ summary: "Extrato paginado e filtrado de um cartão" })
  async listPurchases(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query() query: ListCreditCardPurchasesQueryDto,
  ) {
    await this.creditCardsService.assertOwnership(user.sub, id);
    const data = await this.purchasesService.list(user.sub, id, query);
    return { message: "Extrato do cartão.", data };
  }

  @Post(":id/purchases")
  @ApiOperation({ summary: "Cadastra uma compra manual (à vista ou parcelada)" })
  async createPurchase(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateCreditCardPurchaseDto,
  ) {
    const card = await this.creditCardsService.assertOwnedActiveCard(user.sub, id);
    const data = await this.purchasesService.create(user.sub, card, dto);
    return { message: "Compra cadastrada com sucesso.", data };
  }

  @Get(":id/invoices")
  @ApiOperation({ summary: "Lista as faturas de um cartão" })
  async listInvoices(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.creditCardsService.assertOwnership(user.sub, id);
    const data = await this.invoicesService.list(user.sub, id);
    return { message: "Faturas.", data };
  }

  @Get(":id/invoices/:invoiceId")
  @ApiOperation({ summary: "Consulta o detalhe de uma fatura, com suas compras" })
  async getInvoice(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("invoiceId") invoiceId: string,
  ) {
    await this.creditCardsService.assertOwnership(user.sub, id);
    const data = await this.invoicesService.findOne(user.sub, invoiceId);
    return { message: "Fatura.", data };
  }

  @Post(":id/invoices/:invoiceId/pay")
  @ApiOperation({ summary: "Paga uma fatura, debitando o valor de uma conta bancária" })
  async payInvoice(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("invoiceId") invoiceId: string,
    @Body() dto: PayInvoiceDto,
  ) {
    await this.creditCardsService.assertOwnership(user.sub, id);
    const data = await this.invoicesService.pay(user.sub, invoiceId, dto);
    return { message: "Fatura paga com sucesso.", data };
  }
}
