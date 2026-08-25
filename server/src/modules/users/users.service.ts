import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import { AiProvider, UserStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AppConfigService } from "../../config/app-config.service";
import { decryptSecret, encryptSecret } from "../../common/utils/secret-crypto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import type { UpdateSecurityPreferencesDto } from "./dto/update-security-preferences.dto";

export type PublicUser = Pick<
  User,
  | "id"
  | "name"
  | "email"
  | "emailVerified"
  | "status"
  | "role"
  | "createdAt"
  | "phone"
  | "currency"
  | "notifyBillDue"
  | "notifyCardInvoice"
  | "notifyGoalProgress"
  | "notifyLowBalance"
  | "notifyInvestment"
  | "biometricEnabled"
  | "twoFactorEnabled"
  | "newDeviceAlertEnabled"
  | "aiProvider"
> & { hasAiApiKey: boolean; hasPluggyCredentials: boolean };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        status: UserStatus.PENDING,
      },
    });
  }

  markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, status: UserStatus.ACTIVE },
    });
  }

  updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
    });
  }

  updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
    });
  }

  updateSecurityPreferences(userId: string, dto: UpdateSecurityPreferencesDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
    });
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      phone: user.phone,
      currency: user.currency,
      notifyBillDue: user.notifyBillDue,
      notifyCardInvoice: user.notifyCardInvoice,
      notifyGoalProgress: user.notifyGoalProgress,
      notifyLowBalance: user.notifyLowBalance,
      notifyInvestment: user.notifyInvestment,
      biometricEnabled: user.biometricEnabled,
      twoFactorEnabled: user.twoFactorEnabled,
      newDeviceAlertEnabled: user.newDeviceAlertEnabled,
      aiProvider: user.aiProvider,
      hasAiApiKey: Boolean(user.aiApiKeyEncrypted),
      hasPluggyCredentials: Boolean(user.pluggyClientId && user.pluggyClientSecretEncrypted),
    };
  }

  async setAiCredentials(userId: string, provider: AiProvider, apiKey: string): Promise<void> {
    const encrypted = encryptSecret(apiKey, this.config.get("JWT_ACCESS_SECRET"));
    await this.prisma.user.update({
      where: { id: userId },
      data: { aiProvider: provider, aiApiKeyEncrypted: encrypted },
    });
  }

  async clearAiCredentials(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { aiApiKeyEncrypted: null },
    });
  }

  async getAiCredentials(
    userId: string,
  ): Promise<{ provider: AiProvider; apiKey: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { aiProvider: true, aiApiKeyEncrypted: true },
    });
    if (!user?.aiApiKeyEncrypted) return null;
    return {
      provider: user.aiProvider,
      apiKey: decryptSecret(user.aiApiKeyEncrypted, this.config.get("JWT_ACCESS_SECRET")),
    };
  }

  async setPluggyCredentials(userId: string, clientId: string, clientSecret: string): Promise<void> {
    const encrypted = encryptSecret(clientSecret, this.config.get("JWT_ACCESS_SECRET"));
    await this.prisma.user.update({
      where: { id: userId },
      data: { pluggyClientId: clientId, pluggyClientSecretEncrypted: encrypted },
    });
  }

  async clearPluggyCredentials(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pluggyClientId: null, pluggyClientSecretEncrypted: null },
    });
  }

  async getPluggyCredentials(
    userId: string,
  ): Promise<{ clientId: string; clientSecret: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pluggyClientId: true, pluggyClientSecretEncrypted: true },
    });
    if (!user?.pluggyClientId || !user.pluggyClientSecretEncrypted) return null;
    return {
      clientId: user.pluggyClientId,
      clientSecret: decryptSecret(
        user.pluggyClientSecretEncrypted,
        this.config.get("JWT_ACCESS_SECRET"),
      ),
    };
  }
}
