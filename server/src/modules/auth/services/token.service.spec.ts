import { JwtService } from "@nestjs/jwt";
import { AppConfigService } from "../../../config/app-config.service";
import { TokenService, parseDurationToSeconds } from "./token.service";

describe("parseDurationToSeconds", () => {
  it("parses minutes", () => {
    expect(parseDurationToSeconds("15m")).toBe(900);
  });

  it("parses hours", () => {
    expect(parseDurationToSeconds("2h")).toBe(7200);
  });

  it("parses days", () => {
    expect(parseDurationToSeconds("1d")).toBe(86400);
  });

  it("throws on an invalid format", () => {
    expect(() => parseDurationToSeconds("banana")).toThrow();
  });
});

describe("TokenService", () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_ACCESS_EXPIRES_IN: "1h",
        JWT_REFRESH_EXPIRES_IN_DAYS: 30,
      };
      return values[key];
    }),
  } as unknown as AppConfigService;

  const service = new TokenService(new JwtService(), config);

  it("signs an access token containing the payload", () => {
    const token = service.signAccessToken({ sub: "user-1", email: "a@b.com", role: "USER" });
    expect(token.split(".")).toHaveLength(3);
  });

  it("exposes the configured access token TTL in seconds", () => {
    expect(service.accessTokenExpiresInSeconds).toBe(3600);
  });

  it("computes a refresh token expiry ~30 days in the future", () => {
    const diffMs = service.refreshTokenExpiresAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
  });

  it("generates opaque tokens whose hash is deterministic from the token", () => {
    const { token, hash } = service.generateOpaqueToken();
    expect(token).toHaveLength(96);
    expect(service.hash(token)).toBe(hash);
  });

  it("generates unique tokens on each call", () => {
    const a = service.generateOpaqueToken();
    const b = service.generateOpaqueToken();
    expect(a.token).not.toBe(b.token);
  });
});
