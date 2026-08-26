import { TwoFactorService } from "./two-factor.service";

describe("TwoFactorService", () => {
  let service: TwoFactorService;

  beforeEach(() => {
    service = new TwoFactorService();
  });

  it("generates a base32 secret and a matching otpauth:// URL", () => {
    const secret = service.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);

    const otpauthUrl = service.generateOtpauthUrl("maria@example.com", secret);
    expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(otpauthUrl).toContain(encodeURIComponent("maria@example.com"));
  });

  it("verifies a code generated from the same secret via the otplib functional API", async () => {
    const { generate } = await import("otplib");
    const secret = service.generateSecret();
    const code = await generate({ secret });

    await expect(service.verifyCode(secret, code)).resolves.toBe(true);
  });

  it("rejects a code generated from a different secret", async () => {
    const { generate } = await import("otplib");
    const codeFromOtherSecret = await generate({ secret: service.generateSecret() });

    await expect(service.verifyCode(service.generateSecret(), codeFromOtherSecret)).resolves.toBe(
      false,
    );
  });
});
