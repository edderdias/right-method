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
import { RevenuesService } from "./revenues.service";
import { CreateRevenueDto } from "./dto/create-revenue.dto";
import { UpdateRevenueDto } from "./dto/update-revenue.dto";
import { ListRevenuesQueryDto } from "./dto/list-revenues-query.dto";

@ApiTags("revenues")
@ApiBearerAuth()
@Controller("revenues")
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Post()
  @ApiOperation({ summary: "Cadastra uma nova receita" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRevenueDto) {
    const data = await this.revenuesService.create(user.sub, dto);
    return { message: "Receita cadastrada com sucesso.", data };
  }

  @Get()
  @ApiOperation({ summary: "Lista as receitas do usuário autenticado" })
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListRevenuesQueryDto) {
    const data = await this.revenuesService.list(user.sub, query);
    return { message: "Receitas.", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulta uma receita específica" })
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.revenuesService.findOne(user.sub, id);
    return { message: "Receita.", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza uma receita (inclui alternar status recebida/pendente)" })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateRevenueDto,
  ) {
    const data = await this.revenuesService.update(user.sub, id, dto);
    return { message: "Receita atualizada com sucesso.", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui uma receita" })
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.revenuesService.remove(user.sub, id);
    return { message: "Receita excluída com sucesso." };
  }
}
