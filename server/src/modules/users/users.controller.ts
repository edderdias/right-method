import { Body, Controller, Delete, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { UsersService } from "./users.service";
import { SetAiCredentialsDto } from "./dto/set-ai-credentials.dto";
import { SetPluggyCredentialsDto } from "./dto/set-pluggy-credentials.dto";
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

  @Get("ai-credentials")
  @ApiOperation({ summary: "Indica o provedor de IA ativo e se o usuário já configurou uma chave" })
  async getAiCredentialsStatus(@CurrentUser() user: JwtPayload) {
    const credentials = await this.usersService.getAiCredentials(user.sub);
    const profile = await this.usersService.findById(user.sub);
    return {
      message: "Status das credenciais de IA.",
      data: { provider: profile?.aiProvider, hasKey: credentials !== null },
    };
  }

  @Patch("ai-credentials")
  @ApiOperation({ summary: "Salva o provedor e a chave de IA do usuário para o Certo IA" })
  async setAiCredentials(@CurrentUser() user: JwtPayload, @Body() dto: SetAiCredentialsDto) {
    await this.usersService.setAiCredentials(user.sub, dto.provider, dto.apiKey);
    return {
      message: "Credenciais de IA salvas com sucesso.",
      data: { provider: dto.provider, hasKey: true },
    };
  }

  @Delete("ai-credentials")
  @ApiOperation({ summary: "Remove a chave de IA do usuário" })
  async removeAiCredentials(@CurrentUser() user: JwtPayload) {
    await this.usersService.clearAiCredentials(user.sub);
    const profile = await this.usersService.findById(user.sub);
    return {
      message: "Credenciais de IA removidas.",
      data: { provider: profile?.aiProvider, hasKey: false },
    };
  }

  @Get("pluggy-credentials")
  @ApiOperation({ summary: "Indica se o usuário já configurou credenciais do Pluggy" })
  async getPluggyCredentialsStatus(@CurrentUser() user: JwtPayload) {
    const credentials = await this.usersService.getPluggyCredentials(user.sub);
    return {
      message: "Status das credenciais do Pluggy.",
      data: { hasCredentials: credentials !== null },
    };
  }

  @Patch("pluggy-credentials")
  @ApiOperation({ summary: "Salva as credenciais do Pluggy do usuário para o Open Finance" })
  async setPluggyCredentials(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetPluggyCredentialsDto,
  ) {
    await this.usersService.setPluggyCredentials(user.sub, dto.clientId, dto.clientSecret);
    return { message: "Credenciais do Pluggy salvas com sucesso.", data: { hasCredentials: true } };
  }

  @Delete("pluggy-credentials")
  @ApiOperation({ summary: "Remove as credenciais do Pluggy do usuário" })
  async removePluggyCredentials(@CurrentUser() user: JwtPayload) {
    await this.usersService.clearPluggyCredentials(user.sub);
    return { message: "Credenciais do Pluggy removidas.", data: { hasCredentials: false } };
  }
}
