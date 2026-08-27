import { WebAuthnChallengeMissingException } from "../../common/exceptions/app.exception";
import { WebAuthnService } from "./webauthn.service";

function createRedisMock() {
  const store = new Map<string, string>();
  return {
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
  };
}

describe("WebAuthnService", () => {
  let redis: ReturnType<typeof createRedisMock>;
  let usersService: any;
  let config: any;
  let service: WebAuthnService;

  beforeEach(() => {
    redis = createRedisMock();
    usersService = {
      listWebAuthnCredentials: jest.fn().mockResolvedValue([]),
      findWebAuthnCredentialByCredentialId: jest.fn(),
    };
    config = { get: jest.fn(() => "http://localhost:8080") };
    service = new WebAuthnService(redis as any, usersService, config);
  });

  describe("generateRegistrationOptions", () => {
    it("derives rpID from FRONTEND_URL and stores the challenge for this user", async () => {
      const options = await service.generateRegistrationOptions("user-1", "maria@example.com");

      expect(options.rp.id).toBe("localhost");
      expect(options.user.name).toBe("maria@example.com");
      expect(redis.set).toHaveBeenCalledWith(
        "webauthn-reg:user-1",
        options.challenge,
        "EX",
        expect.any(Number),
      );
    });
  });

  describe("generateLoginOptions", () => {
    it("returns a ceremonyId and stores the challenge keyed by it", async () => {
      const { options, ceremonyId } = await service.generateLoginOptions();

      expect(ceremonyId).toMatch(/^[a-f0-9]{32}$/);
      expect(redis.set).toHaveBeenCalledWith(
        `webauthn-login:${ceremonyId}`,
        options.challenge,
        "EX",
        expect.any(Number),
      );
    });
  });

  describe("verifyLogin", () => {
    it("rejects an unknown or expired ceremony", async () => {
      await expect(
        service.verifyLogin("unknown-ceremony", {} as any),
      ).rejects.toBeInstanceOf(WebAuthnChallengeMissingException);
    });
  });
});
