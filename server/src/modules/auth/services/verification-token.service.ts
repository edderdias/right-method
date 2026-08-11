import { Injectable } from "@nestjs/common";
import { VerificationTokenType, type VerificationToken } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { InvalidTokenException } from "../../../common/exceptions/app.exception";
import { TokenService } from "./token.service";

const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
const PASSWORD_RESET_TTL_SECONDS = 15 * 60;

@Injectable()
export class VerificationTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async issue(userId: string, type: VerificationTokenType): Promise<string> {
    const ttlSeconds =
      type === VerificationTokenType.EMAIL_VERIFICATION
        ? EMAIL_VERIFICATION_TTL_SECONDS
        : PASSWORD_RESET_TTL_SECONDS;

    // Invalidate any previous unused tokens of this type so only the latest one works.
    await this.prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { token, hash } = this.tokenService.generateOpaqueToken();

    await this.prisma.verificationToken.create({
      data: {
        userId,
        type,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    return token;
  }

  async consume(token: string, type: VerificationTokenType): Promise<VerificationToken> {
    const hash = this.tokenService.hash(token);

    const record = await this.prisma.verificationToken.findFirst({
      where: { tokenHash: hash, type, usedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!record) {
      throw new InvalidTokenException();
    }

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return record;
  }
}
