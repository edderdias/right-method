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
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { ListExpensesQueryDto } from "./dto/list-expenses-query.dto";

@ApiTags("expenses")
@ApiBearerAuth()
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: "Cadastra uma nova despesa" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    const data = await this.expensesService.create(user.sub, dto);
    return { message: "Despesa cadastrada com sucesso.", data };
  }

  @Get()
  @ApiOperation({ summary: "Lista as despesas do usuário autenticado" })
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListExpensesQueryDto) {
    const data = await this.expensesService.list(user.sub, query);
    return { message: "Despesas.", data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulta uma despesa específica" })
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const data = await this.expensesService.findOne(user.sub, id);
    return { message: "Despesa.", data };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza uma despesa (inclui alternar status paga/pendente)" })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const data = await this.expensesService.update(user.sub, id, dto);
    return { message: "Despesa atualizada com sucesso.", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exclui uma despesa" })
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.expensesService.remove(user.sub, id);
    return { message: "Despesa excluída com sucesso." };
  }
}
