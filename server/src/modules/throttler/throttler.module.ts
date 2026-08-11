import { Module } from "@nestjs/common";
import { ThrottlerModule as NestThrottlerModule } from "@nestjs/throttler";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../database/redis.module";
import { LoginLockoutService } from "./login-lockout.service";
import { ThrottlerStorageRedisService } from "./throttler-storage-redis.service";

@Module({
  imports: [
    NestThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [{ name: "default", ttl: 60_000, limit: 20 }],
        storage: new ThrottlerStorageRedisService(redis),
        errorMessage: "Muitas tentativas. Tente novamente mais tarde.",
      }),
    }),
  ],
  providers: [LoginLockoutService],
  exports: [LoginLockoutService, NestThrottlerModule],
})
export class ThrottlerModule {}
