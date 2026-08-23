import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { CreditCardPurchasesService } from "./credit-card-purchases.service";
import { UpdateCreditCardPurchaseDto } from "./dto/update-credit-card-purchase.dto";
import { RemovePurchaseQueryDto } from "./dto/remove-purchase-query.dto";

@ApiTags("credit-cards")
@ApiBearerAuth()
@Controller("credit-card-purchases")
export class CreditCardPurchasesController {
  constructor(private readonly purchasesService: CreditCardPurchasesService) {}

  @Get(":id")
  @ApiOperation({ summary: "Consulta o detalhe de uma compra de cartão" })
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.purchasesService.findOne(user.sub, id);
    return { message: "Compra.", data };
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Atualiza uma compra (categoria/observação sempre; demais campos só para compras manuais)",
  })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateCreditCardPurchaseDto,
  ) {
    const data = await this.purchasesService.update(user.sub, id, dto);
    return { message: "Compra atualizada com sucesso.", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui uma compra (?scope=one|group para compras parceladas)" })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query() query: RemovePurchaseQueryDto,
  ) {
    await this.purchasesService.remove(user.sub, id, query.scope ?? "one");
    return { message: "Compra excluída com sucesso." };
  }
}
