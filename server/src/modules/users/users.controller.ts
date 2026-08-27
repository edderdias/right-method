import { Body, Controller, Delete, Get, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import {
  TwoFactorCodeInvalidException,
  TwoFactorSetupNotFoundException,
} from "../../common/exceptions/app.exception";
import { UsersService } from "./users.service";
import { TwoFactorService } from "./two-factor.service";
import { WebAuthnService } from "./webauthn.service";
import { SetAiCredentialsDto } from "./dto/set-ai-credentials.dto";
import { SetPluggyCredentialsDto } from "./dto/set-pluggy-credentials.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { UpdateSecurityPreferencesDto } from "./dto/update-security-preferences.dto";
import { ConfirmTwoFactorDto } from "./dto/confirm-two-factor.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users/me")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly twoFactorService: TwoFactorService,
    private readonly webAuthnService: WebAuthnService,
  ) {}

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

  @Post("2fa/setup")
  @ApiOperation({ summary: "Gera um novo segredo de 2FA e o QR code para escanear" })
  async setupTwoFactor(@CurrentUser() user: JwtPayload) {
    const secret = this.twoFactorService.generateSecret();
    await this.usersService.setPendingTwoFactorSecret(user.sub, secret);
    const otpauthUrl = this.twoFactorService.generateOtpauthUrl(user.email, secret);
    const qrCodeDataUrl = await this.twoFactorService.generateQrCodeDataUrl(otpauthUrl);
    return {
      message: "Escaneie o QR code no seu app autenticador e confirme com um código.",
      data: { otpauthUrl, qrCodeDataUrl },
    };
  }

  @Post("2fa/confirm")
  @ApiOperation({ summary: "Confirma o código do app autenticador e ativa o 2FA" })
  async confirmTwoFactor(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmTwoFactorDto) {
    const secret = await this.usersService.getTwoFactorSecret(user.sub);
    if (!secret) {
      throw new TwoFactorSetupNotFoundException();
    }
    const valid = await this.twoFactorService.verifyCode(secret, dto.code);
    if (!valid) {
      throw new TwoFactorCodeInvalidException();
    }
    await this.usersService.confirmTwoFactor(user.sub);
    return { message: "Autenticação em dois fatores ativada.", data: { twoFactorEnabled: true } };
  }

  @Delete("2fa")
  @ApiOperation({ summary: "Desativa a autenticação em dois fatores" })
  async disableTwoFactor(@CurrentUser() user: JwtPayload) {
    await this.usersService.disableTwoFactor(user.sub);
    return { message: "Autenticação em dois fatores desativada.", data: { twoFactorEnabled: false } };
  }

  @Post("webauthn/register-options")
  @ApiOperation({ summary: "Gera as opções de registro de uma nova credencial biométrica" })
  async webAuthnRegisterOptions(@CurrentUser() user: JwtPayload) {
    const options = await this.webAuthnService.generateRegistrationOptions(user.sub, user.email);
    return { message: "Opções de registro geradas.", data: options };
  }

  @Post("webauthn/register-verify")
  @ApiOperation({ summary: "Confirma o registro de uma nova credencial biométrica" })
  async webAuthnRegisterVerify(
    @CurrentUser() user: JwtPayload,
    @Body() response: RegistrationResponseJSON,
  ) {
    await this.webAuthnService.verifyRegistration(user.sub, response);
    return { message: "Biometria ativada com sucesso.", data: { biometricEnabled: true } };
  }

  @Delete("webauthn")
  @ApiOperation({ summary: "Remove todas as credenciais biométricas do usuário" })
  async removeWebAuthn(@CurrentUser() user: JwtPayload) {
    await this.usersService.removeAllWebAuthnCredentials(user.sub);
    return { message: "Biometria desativada.", data: { biometricEnabled: false } };
  }
}
