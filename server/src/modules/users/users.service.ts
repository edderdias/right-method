import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import { UserStatus } from "@prisma/client";
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
> & { hasOpenAiApiKey: boolean };

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
      hasOpenAiApiKey: Boolean(user.openAiApiKeyEncrypted),
    };
  }

  async setOpenAiApiKey(userId: string, apiKey: string): Promise<void> {
    const encrypted = encryptSecret(apiKey, this.config.get("JWT_ACCESS_SECRET"));
    await this.prisma.user.update({
      where: { id: userId },
      data: { openAiApiKeyEncrypted: encrypted },
    });
  }

  async clearOpenAiApiKey(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { openAiApiKeyEncrypted: null },
    });
  }

  async getOpenAiApiKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { openAiApiKeyEncrypted: true },
    });
    if (!user?.openAiApiKeyEncrypted) return null;
    return decryptSecret(user.openAiApiKeyEncrypted, this.config.get("JWT_ACCESS_SECRET"));
  }
}
