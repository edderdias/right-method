import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { AccountsService } from "./accounts.service";
import { CreateAccountDto } from "./dto/create-account.dto";

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

  @Post()
  @ApiOperation({ summary: "Cria uma conta para o usuário autenticado" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountDto) {
    const data = await this.accountsService.create(user.sub, dto);
    return { message: "Conta criada com sucesso.", data };
  }
}
