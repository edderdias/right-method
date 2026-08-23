import { Body, Controller, Delete, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { UsersService } from "./users.service";
import { SetOpenAiKeyDto } from "./dto/set-openai-key.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { UpdateSecurityPreferencesDto } from "./dto/update-security-preferences.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users/me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch()
  @ApiOperation({ summary: "Atualiza o perfil do usuário (nome, telefone, moeda)" })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.sub, dto);
    return { message: "Perfil atualizado com sucesso.", data: this.usersService.toPublic(updated) };
  }

  @Patch("notifications")
  @ApiOperation({ summary: "Atualiza as preferências de notificação do usuário" })
  async updateNotifications(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const updated = await this.usersService.updateNotificationPreferences(user.sub, dto);
    return {
      message: "Preferências de notificação atualizadas.",
      data: this.usersService.toPublic(updated),
    };
  }

  @Patch("security")
  @ApiOperation({ summary: "Atualiza as preferências de segurança do usuário" })
  async updateSecurity(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSecurityPreferencesDto,
  ) {
    const updated = await this.usersService.updateSecurityPreferences(user.sub, dto);
    return {
      message: "Preferências de segurança atualizadas.",
      data: this.usersService.toPublic(updated),
    };
  }

  @Get("openai-key")
  @ApiOperation({ summary: "Indica se o usuário já configurou uma chave da OpenAI" })
  async getOpenAiKeyStatus(@CurrentUser() user: JwtPayload) {
    const apiKey = await this.usersService.getOpenAiApiKey(user.sub);
    return { message: "Status da chave da OpenAI.", data: { hasKey: apiKey !== null } };
  }

  @Patch("openai-key")
  @ApiOperation({ summary: "Salva a chave da API OpenAI do usuário para o Certo IA" })
  async setOpenAiKey(@CurrentUser() user: JwtPayload, @Body() dto: SetOpenAiKeyDto) {
    await this.usersService.setOpenAiApiKey(user.sub, dto.apiKey);
    return { message: "Chave da OpenAI salva com sucesso.", data: { hasKey: true } };
  }

  @Delete("openai-key")
  @ApiOperation({ summary: "Remove a chave da API OpenAI do usuário" })
  async removeOpenAiKey(@CurrentUser() user: JwtPayload) {
    await this.usersService.clearOpenAiApiKey(user.sub);
    return { message: "Chave da OpenAI removida.", data: { hasKey: false } };
  }
}
