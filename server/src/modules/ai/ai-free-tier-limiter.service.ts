import { Inject, Injectable, Logger } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../database/redis.module";
import { AppConfigService } from "../../config/app-config.service";
import { AiFreeTierLimitException } from "../../common/exceptions/app.exception";

export interface FreeTierUsage {
  used: number;
  limit: number;
  remaining: number;
}

/** Per-user daily cap for the shared fallback key (Gemini free tier), so a single user can't
 * burn the whole account quota. Mirrors LoginLockoutService's Redis incr/expire pattern.
 * The counter key is bucketed by calendar day in America/Sao_Paulo (the app's timezone).
 *
 * Redis failures fail-open: a cache blip must not take down the assistant, so we log and allow
 * the request rather than 500. Worst case is a little quota overshoot until Redis recovers. */
@Injectable()
export class AiFreeTierLimiterService {
  private readonly logger = new Logger(AiFreeTierLimiterService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfigService,
  ) {}

  private key(userId: string): string {
    // Shift by -3h so the bucket flips at local midnight (GMT-3), not UTC midnight.
    const day = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return `ai:free:${userId}:${day}`;
  }

  async assertWithinLimit(userId: string): Promise<void> {
    let used: number;
    try {
      used = Number((await this.redis.get(this.key(userId))) ?? 0);
    } catch (error) {
      this.logger.warn(
        `Redis indisponível ao checar limite gratuito, liberando: ${(error as Error).message}`,
      );
      return;
    }
    if (used >= this.config.get("AI_FREE_DAILY_LIMIT")) {
      throw new AiFreeTierLimitException();
    }
  }

  /** Call only after the provider call succeeds — a failed request must not consume quota. */
  async registerUse(userId: string): Promise<void> {
    try {
      const key = this.key(userId);
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 48 * 60 * 60);
      }
    } catch (error) {
      this.logger.warn(`Redis indisponível ao registrar uso gratuito: ${(error as Error).message}`);
    }
  }

  async getUsage(userId: string): Promise<FreeTierUsage> {
    const limit = this.config.get("AI_FREE_DAILY_LIMIT");
    let used = 0;
    try {
      used = Number((await this.redis.get(this.key(userId))) ?? 0);
    } catch (error) {
      this.logger.warn(`Redis indisponível ao ler uso gratuito: ${(error as Error).message}`);
    }
    return { used, limit, remaining: Math.max(0, limit - used) };
  }
}
