import { TooManyAttemptsException } from "../../common/exceptions/app.exception";
import { LoginLockoutService } from "./login-lockout.service";

describe("LoginLockoutService", () => {
  let redis: any;
  let service: LoginLockoutService;

  beforeEach(() => {
    redis = { get: jest.fn(), incr: jest.fn(), expire: jest.fn(), del: jest.fn() };
    service = new LoginLockoutService(redis);
  });

  it("allows the request when there is no prior attempt recorded", async () => {
    redis.get.mockResolvedValue(null);
    await expect(service.assertNotLocked("a@b.com", "1.1.1.1")).resolves.toBeUndefined();
  });

  it("blocks once 5 attempts have been recorded", async () => {
    redis.get.mockResolvedValue("5");
    await expect(service.assertNotLocked("a@b.com", "1.1.1.1")).rejects.toBeInstanceOf(
      TooManyAttemptsException,
    );
  });

  it("sets an expiry only on the first failure", async () => {
    redis.incr.mockResolvedValue(1);
    await service.registerFailure("a@b.com", "1.1.1.1");
    expect(redis.expire).toHaveBeenCalledWith("login-lockout:a@b.com:1.1.1.1", 15 * 60);
  });

  it("does not re-set the expiry on subsequent failures", async () => {
    redis.incr.mockResolvedValue(2);
    await service.registerFailure("a@b.com", "1.1.1.1");
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("throws once the 5th failure is registered", async () => {
    redis.incr.mockResolvedValue(5);
    await expect(service.registerFailure("a@b.com", "1.1.1.1")).rejects.toBeInstanceOf(
      TooManyAttemptsException,
    );
  });

  it("clears the counter on reset", async () => {
    await service.reset("a@b.com", "1.1.1.1");
    expect(redis.del).toHaveBeenCalledWith("login-lockout:a@b.com:1.1.1.1");
  });
});
