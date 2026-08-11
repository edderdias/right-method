import { Injectable } from "@nestjs/common";
import type { UserSession } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { SessionNotFoundException } from "../../common/exceptions/app.exception";
import type { RequestMetadata } from "../../common/utils/request-metadata";

export type PublicSession = Pick<
  UserSession,
  "id" | "ipAddress" | "userAgent" | "createdAt" | "expiresAt"
>;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    metadata: RequestMetadata,
  ): Promise<UserSession> {
    return this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
  }

  findValidByHash(refreshTokenHash: string): Promise<UserSession | null> {
    return this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listActiveForUser(userId: string): Promise<PublicSession[]> {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
    });
  }

  async revokeForUser(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new SessionNotFoundException();
    }

    await this.revoke(sessionId);
  }
}
