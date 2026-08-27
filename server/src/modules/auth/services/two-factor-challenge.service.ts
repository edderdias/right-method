import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../../database/redis.module";
import { TokenService } from "./token.service";

const CHALLENGE_TTL_SECONDS = 5 * 60;
const KEY_PREFIX = "2fa-challenge:";

/** Short-lived, Redis-backed pending-login state issued after password verification when the
 * user has 2FA enabled. Deliberately NOT a JWT — an opaque token can't be mistaken for (or
 * accepted by JwtAuthGuard as) a real access token before the second factor is verified. */
@Injectable()
export class TwoFactorChallengeService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly tokenService: TokenService,
  ) {}

  async create(userId: string): Promise<string> {
    const { token, hash } = this.tokenService.generateOpaqueToken();
    await this.redis.set(`${KEY_PREFIX}${hash}`, userId, "EX", CHALLENGE_TTL_SECONDS);
    return token;
  }

  resolve(challengeToken: string): Promise<string | null> {
    return this.redis.get(`${KEY_PREFIX}${this.tokenService.hash(challengeToken)}`);
  }

  async consume(challengeToken: string): Promise<void> {
    await this.redis.del(`${KEY_PREFIX}${this.tokenService.hash(challengeToken)}`);
  }
}
