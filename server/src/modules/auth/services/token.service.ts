import { randomBytes, createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AppConfigService } from "../../../config/app-config.service";
import type { JwtPayload } from "../../../common/types/authenticated-request";

export interface OpaqueToken {
  token: string;
  hash: string;
}

const DURATION_UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNITS[unit as string]!;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get("JWT_ACCESS_EXPIRES_IN"),
    });
  }

  get accessTokenExpiresInSeconds(): number {
    return parseDurationToSeconds(this.config.get("JWT_ACCESS_EXPIRES_IN"));
  }

  get refreshTokenExpiresAt(): Date {
    const days = this.config.get("JWT_REFRESH_EXPIRES_IN_DAYS");
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  generateOpaqueToken(): OpaqueToken {
    const token = randomBytes(48).toString("hex");
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
