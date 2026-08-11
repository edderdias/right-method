import type { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import type Redis from "ioredis";

export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${storageKey}:blocked`;

    const blockedTtlMs = await this.redis.pttl(blockKey);
    if (blockedTtlMs > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockedTtlMs / 1000),
      };
    }

    const totalHits = await this.redis.incr(storageKey);
    if (totalHits === 1) {
      await this.redis.pexpire(storageKey, ttl);
    }

    const timeToExpireMs = await this.redis.pttl(storageKey);
    const isBlocked = totalHits > limit;

    if (isBlocked && blockDuration > 0) {
      await this.redis.set(blockKey, "1", "PX", blockDuration);
    }

    return {
      totalHits,
      timeToExpire: Math.ceil(Math.max(timeToExpireMs, 0) / 1000),
      isBlocked,
      timeToBlockExpire: isBlocked ? Math.ceil(blockDuration / 1000) : 0,
    };
  }
}
