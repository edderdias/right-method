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
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { Public } from "../../../common/decorators/public.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { getRequestMetadata } from "../../../common/utils/request-metadata";
import type { JwtPayload } from "../../../common/types/authenticated-request";
import { AuthService } from "../services/auth.service";
import { SessionsService } from "../../sessions/sessions.service";
import { UsersService } from "../../users/users.service";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { RefreshTokenDto } from "../dto/refresh-token.dto";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { VerifyEmailDto } from "../dto/verify-email.dto";
import { ResendVerificationDto } from "../dto/resend-verification.dto";
import { VerifyTwoFactorDto } from "../dto/verify-two-factor.dto";
import { VerifyWebAuthnLoginDto } from "../dto/verify-webauthn-login.dto";

const GENERIC_OK = {
  message: "Se os dados informados forem válidos, você receberá as instruções por e-mail.",
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("register")
  @ApiOperation({ summary: "Cadastra um novo usuário" })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, getRequestMetadata(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  @ApiOperation({ summary: "Autentica um usuário" })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const data = await this.authService.login(dto, getRequestMetadata(req));
    return { message: "Login realizado com sucesso.", data };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("2fa/verify")
  @ApiOperation({ summary: "Confirma o código de 2FA e conclui o login" })
  async verifyTwoFactor(@Body() dto: VerifyTwoFactorDto, @Req() req: Request) {
    const data = await this.authService.verifyTwoFactor(
      dto.challengeToken,
      dto.code,
      getRequestMetadata(req),
    );
    return { message: "Login realizado com sucesso.", data };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("webauthn/login-options")
  @ApiOperation({ summary: "Gera o desafio de login por biometria (passkey descobrível)" })
  async webAuthnLoginOptions() {
    const data = await this.authService.webAuthnLoginOptions();
    return { message: "Opções de login geradas.", data };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("webauthn/login-verify")
  @ApiOperation({ summary: "Confirma o login por biometria" })
  async webAuthnLoginVerify(@Body() dto: VerifyWebAuthnLoginDto, @Req() req: Request) {
    const data = await this.authService.completeWebAuthnLogin(
      dto.ceremonyId,
      dto.response,
      getRequestMetadata(req),
    );
    return { message: "Login realizado com sucesso.", data };
  }

  @HttpCode(HttpStatus.OK)
  @Post("logout")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Encerra a sessão atual" })
  async logout(@CurrentUser() user: JwtPayload, @Body() dto: RefreshTokenDto, @Req() req: Request) {
    await this.authService.logout(user.sub, dto.refreshToken, getRequestMetadata(req));
    return { message: "Logout realizado com sucesso." };
  }

  @HttpCode(HttpStatus.OK)
  @Post("logout-all")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Encerra todas as sessões do usuário" })
  async logoutAll(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    await this.authService.logoutAll(user.sub, getRequestMetadata(req));
    return { message: "Todas as sessões foram encerradas." };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  @ApiOperation({ summary: "Renova o access token a partir de um refresh token válido" })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const data = await this.authService.refresh(dto.refreshToken, getRequestMetadata(req));
    return { message: "Token renovado com sucesso.", data };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  @ApiOperation({ summary: "Solicita a recuperação de senha" })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto.email, getRequestMetadata(req));
    return GENERIC_OK;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("reset-password")
  @ApiOperation({ summary: "Redefine a senha a partir de um token de recuperação" })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.authService.resetPassword(dto.token, dto.password, getRequestMetadata(req));
    return { message: "Senha redefinida com sucesso. Faça login novamente." };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("verify-email")
  @ApiOperation({ summary: "Confirma o e-mail do usuário" })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const data = await this.authService.verifyEmail(dto.token, getRequestMetadata(req));
    return { message: "E-mail verificado com sucesso.", data };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("resend-verification")
  @ApiOperation({ summary: "Reenvia o e-mail de verificação" })
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() req: Request) {
    await this.authService.resendVerification(dto.email, getRequestMetadata(req));
    return GENERIC_OK;
  }

  @HttpCode(HttpStatus.OK)
  @Patch("password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Altera a senha do usuário autenticado" })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.authService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
      getRequestMetadata(req),
    );
    return { message: "Senha alterada com sucesso." };
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retorna o usuário autenticado" })
  async me(@CurrentUser() user: JwtPayload) {
    const record = await this.usersService.findById(user.sub);
    return {
      message: "Usuário autenticado.",
      data: record ? this.usersService.toPublic(record) : null,
    };
  }

  @Get("sessions")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lista as sessões ativas do usuário" })
  async sessions(@CurrentUser() user: JwtPayload) {
    const data = await this.sessionsService.listActiveForUser(user.sub);
    return { message: "Sessões ativas.", data };
  }

  @Delete("sessions/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoga uma sessão específica" })
  async revokeSession(@CurrentUser() user: JwtPayload, @Param("id") sessionId: string) {
    await this.sessionsService.revokeForUser(user.sub, sessionId);
    return { message: "Sessão revogada com sucesso." };
  }
}
