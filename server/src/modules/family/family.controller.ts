import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { getRequestMetadata } from "../../common/utils/request-metadata";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { FamilyService } from "./family.service";
import { RedeemInviteDto } from "./dto/redeem-invite.dto";

@ApiTags("family")
@ApiBearerAuth()
@Controller("family")
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post("invites")
  @ApiOperation({ summary: "Gera um novo código de convite familiar" })
  async createInvite(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const invite = await this.familyService.createInvite(user.sub, getRequestMetadata(req));
    return { message: "Código de convite gerado com sucesso.", data: invite };
  }

  @Get("invites/active")
  @ApiOperation({ summary: "Consulta o convite pendente atual do usuário, se houver" })
  async getActiveInvite(@CurrentUser() user: JwtPayload) {
    const invite = await this.familyService.getActiveInvite(user.sub);
    return { message: "Convite ativo.", data: invite };
  }

  @Delete("invites/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoga um convite pendente" })
  async revokeInvite(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    await this.familyService.revokeInvite(user.sub, id);
    return { message: "Convite revogado." };
  }

  @Throttle({ default: { limit: 8, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("invites/redeem")
  @ApiOperation({ summary: "Resgata um código de convite e passa a visualizar os dados de quem convidou" })
  async redeemInvite(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RedeemInviteDto,
    @Req() req: Request,
  ) {
    const grant = await this.familyService.redeemInvite(
      user.sub,
      dto.code,
      getRequestMetadata(req),
    );
    return { message: "Convite resgatado com sucesso. Você agora pode visualizar essa conta.", data: grant };
  }

  @Get("members")
  @ApiOperation({ summary: "Lista quem tem acesso de visualização aos seus dados" })
  async listMembers(@CurrentUser() user: JwtPayload) {
    const data = await this.familyService.listMembers(user.sub);
    return { message: "Familiares com acesso.", data };
  }

  @Get("access")
  @ApiOperation({ summary: "Lista as contas de outros usuários que você pode visualizar" })
  async listAccess(@CurrentUser() user: JwtPayload) {
    const data = await this.familyService.listAccessibleOwners(user.sub);
    return { message: "Contas compartilhadas com você.", data };
  }

  @Delete("grants/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoga um compartilhamento (pelo dono ou pelo familiar)" })
  async revokeGrant(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Req() req: Request) {
    await this.familyService.revokeGrant(user.sub, id, getRequestMetadata(req));
    return { message: "Acesso compartilhado revogado." };
  }
}
