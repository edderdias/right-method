import { Injectable } from "@nestjs/common";
import { AuditEvent, UserStatus, VerificationTokenType, type UserRole } from "@prisma/client";
import { AppConfigService } from "../../../config/app-config.service";
import { UsersService, type PublicUser } from "../../users/users.service";
import { SessionsService } from "../../sessions/sessions.service";
import { EmailService } from "../../email/email.service";
import { AuditLogService } from "../../audit/audit-log.service";
import { LoginLockoutService } from "../../throttler/login-lockout.service";
import type { RequestMetadata } from "../../../common/utils/request-metadata";
import {
  AccountBlockedException,
  AccountInactiveException,
  CurrentPasswordInvalidException,
  EmailAlreadyExistsException,
  EmailNotVerifiedException,
  InvalidCredentialsException,
  InvalidTokenException,
} from "../../../common/exceptions/app.exception";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { VerificationTokenService } from "./verification-token.service";
import type { RegisterDto } from "../dto/register.dto";
import type { LoginDto } from "../dto/login.dto";
import type { AuthResponse } from "../types/auth-response.type";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationTokenService: VerificationTokenService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
    private readonly loginLockoutService: LoginLockoutService,
    private readonly config: AppConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    metadata: RequestMetadata,
  ): Promise<{ message: string; data: PublicUser }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyExistsException();
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    const verificationToken = await this.verificationTokenService.issue(
      user.id,
      VerificationTokenType.EMAIL_VERIFICATION,
    );
    void this.emailService.sendEmailVerification(
      user.email,
      user.name,
      this.buildFrontendUrl("verify-email", verificationToken),
    );

    await this.auditLogService.record(AuditEvent.REGISTER, metadata, user.id);

    return {
      message: "Cadastro realizado. Verifique seu e-mail para ativar a conta.",
      data: this.usersService.toPublic(user),
    };
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthResponse> {
    await this.loginLockoutService.assertNotLocked(dto.email, metadata.ipAddress);

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.loginLockoutService.registerFailure(dto.email, metadata.ipAddress);
      await this.auditLogService.record(AuditEvent.LOGIN_FAILED, metadata);
      throw new InvalidCredentialsException();
    }

    const passwordValid = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.loginLockoutService.registerFailure(dto.email, metadata.ipAddress);
      await this.auditLogService.record(AuditEvent.LOGIN_FAILED, metadata, user.id);
      throw new InvalidCredentialsException();
    }

    if (user.status === UserStatus.BLOCKED) {
      await this.auditLogService.record(AuditEvent.LOGIN_FAILED, metadata, user.id);
      throw new AccountBlockedException();
    }

    if (user.status === UserStatus.PENDING) {
      await this.auditLogService.record(AuditEvent.LOGIN_FAILED, metadata, user.id);
      throw new EmailNotVerifiedException();
    }

    if (user.status === UserStatus.INACTIVE) {
      await this.auditLogService.record(AuditEvent.LOGIN_FAILED, metadata, user.id);
      throw new AccountInactiveException();
    }

    await this.loginLockoutService.reset(dto.email, metadata.ipAddress);
    await this.usersService.updateLastLogin(user.id);
    await this.auditLogService.record(AuditEvent.LOGIN_SUCCESS, metadata, user.id);

    if (user.newDeviceAlertEnabled) {
      void this.emailService.sendNewLoginAlert(
        user.email,
        user.name,
        metadata.ipAddress,
        metadata.userAgent,
      );
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role, metadata);
    return { ...tokens, user: this.usersService.toPublic(user) };
  }

  async refresh(refreshToken: string, metadata: RequestMetadata): Promise<AuthResponse> {
    const hash = this.tokenService.hash(refreshToken);
    const session = await this.sessionsService.findValidByHash(hash);
    if (!session) {
      throw new InvalidTokenException("Refresh token inválido ou expirado.");
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionsService.revoke(session.id);
      throw new InvalidCredentialsException();
    }

    await this.sessionsService.revoke(session.id);
    await this.auditLogService.record(AuditEvent.REFRESH_TOKEN, metadata, user.id);

    const tokens = await this.issueTokens(user.id, user.email, user.role, metadata);
    return { ...tokens, user: this.usersService.toPublic(user) };
  }

  async logout(userId: string, refreshToken: string, metadata: RequestMetadata): Promise<void> {
    const hash = this.tokenService.hash(refreshToken);
    const session = await this.sessionsService.findValidByHash(hash);

    if (session && session.userId === userId) {
      await this.sessionsService.revoke(session.id);
    }

    await this.auditLogService.record(AuditEvent.LOGOUT, metadata, userId);
  }

  async logoutAll(userId: string, metadata: RequestMetadata): Promise<void> {
    await this.sessionsService.revokeAllForUser(userId);
    await this.auditLogService.record(AuditEvent.LOGOUT_ALL, metadata, userId);
  }

  async forgotPassword(email: string, metadata: RequestMetadata): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (user && user.status !== UserStatus.BLOCKED) {
      const token = await this.verificationTokenService.issue(
        user.id,
        VerificationTokenType.PASSWORD_RESET,
      );
      await this.emailService.sendPasswordReset(
        user.email,
        user.name,
        this.buildFrontendUrl("reset-password", token),
      );
      await this.auditLogService.record(AuditEvent.PASSWORD_RESET_REQUESTED, metadata, user.id);
    }
    // Always resolves the same way regardless of whether the e-mail exists.
  }

  async resetPassword(
    token: string,
    newPassword: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const record = await this.verificationTokenService.consume(
      token,
      VerificationTokenType.PASSWORD_RESET,
    );

    const passwordHash = await this.passwordService.hash(newPassword);
    const user = await this.usersService.updatePassword(record.userId, passwordHash);
    await this.sessionsService.revokeAllForUser(record.userId);

    await this.emailService.sendPasswordChanged(user.email, user.name);
    await this.auditLogService.record(AuditEvent.PASSWORD_RESET, metadata, record.userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new CurrentPasswordInvalidException();
    }

    const passwordValid = await this.passwordService.verify(user.passwordHash, currentPassword);
    if (!passwordValid) {
      throw new CurrentPasswordInvalidException();
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.usersService.updatePassword(userId, passwordHash);

    await this.emailService.sendPasswordChanged(user.email, user.name);
    await this.auditLogService.record(AuditEvent.PASSWORD_CHANGED, metadata, userId);
  }

  async verifyEmail(token: string, metadata: RequestMetadata): Promise<PublicUser> {
    const record = await this.verificationTokenService.consume(
      token,
      VerificationTokenType.EMAIL_VERIFICATION,
    );

    const user = await this.usersService.markEmailVerified(record.userId);
    await this.auditLogService.record(AuditEvent.EMAIL_VERIFIED, metadata, record.userId);

    return this.usersService.toPublic(user);
  }

  async resendVerification(email: string, metadata: RequestMetadata): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (user && !user.emailVerified) {
      const token = await this.verificationTokenService.issue(
        user.id,
        VerificationTokenType.EMAIL_VERIFICATION,
      );
      await this.emailService.sendEmailVerification(
        user.email,
        user.name,
        this.buildFrontendUrl("verify-email", token),
      );
      await this.auditLogService.record(AuditEvent.EMAIL_VERIFICATION_RESENT, metadata, user.id);
    }
    // Always resolves the same way regardless of whether the e-mail exists or is already verified.
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    metadata: RequestMetadata,
  ) {
    const accessToken = this.tokenService.signAccessToken({ sub: userId, email, role });
    const { token: refreshToken, hash } = this.tokenService.generateOpaqueToken();

    await this.sessionsService.create(
      userId,
      hash,
      this.tokenService.refreshTokenExpiresAt,
      metadata,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokenService.accessTokenExpiresInSeconds,
    };
  }

  private buildFrontendUrl(path: string, token: string): string {
    const base = this.config.get("FRONTEND_URL").replace(/\/$/, "");
    return `${base}/${path}?token=${encodeURIComponent(token)}`;
  }
}
