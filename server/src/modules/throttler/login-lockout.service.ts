import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../database/redis.module";
import { TooManyAttemptsException } from "../../common/exceptions/app.exception";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

@Injectable()
export class LoginLockoutService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(email: string, ipAddress: string): string {
    return `login-lockout:${email.toLowerCase()}:${ipAddress}`;
  }

  async assertNotLocked(email: string, ipAddress: string): Promise<void> {
    const attempts = await this.redis.get(this.key(email, ipAddress));
    if (attempts && Number(attempts) >= MAX_ATTEMPTS) {
      throw new TooManyAttemptsException();
    }
  }

  async registerFailure(email: string, ipAddress: string): Promise<void> {
    const key = this.key(email, ipAddress);
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, WINDOW_SECONDS);
    }
    if (attempts >= MAX_ATTEMPTS) {
      throw new TooManyAttemptsException();
    }
  }

  async reset(email: string, ipAddress: string): Promise<void> {
    await this.redis.del(this.key(email, ipAddress));
  }
}
