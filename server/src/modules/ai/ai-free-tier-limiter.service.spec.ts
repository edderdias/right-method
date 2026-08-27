import { AiFreeTierLimitException } from "../../common/exceptions/app.exception";
import { AiFreeTierLimiterService } from "./ai-free-tier-limiter.service";

describe("AiFreeTierLimiterService", () => {
  let redis: any;
  let config: any;
  let service: AiFreeTierLimiterService;

  beforeEach(() => {
    redis = { get: jest.fn(), incr: jest.fn(), expire: jest.fn() };
    config = { get: jest.fn().mockReturnValue(20) };
    service = new AiFreeTierLimiterService(redis, config);
  });

  it("allows the request when the user has not used the free tier today", async () => {
    redis.get.mockResolvedValue(null);
    await expect(service.assertWithinLimit("user-1")).resolves.toBeUndefined();
  });

  it("allows the request while usage is below the limit", async () => {
    redis.get.mockResolvedValue("19");
    await expect(service.assertWithinLimit("user-1")).resolves.toBeUndefined();
  });

  it("blocks once usage reaches the configured limit", async () => {
    redis.get.mockResolvedValue("20");
    await expect(service.assertWithinLimit("user-1")).rejects.toBeInstanceOf(
      AiFreeTierLimitException,
    );
  });

  it("sets a TTL only on the first use of the day", async () => {
    redis.incr.mockResolvedValue(1);
    await service.registerUse("user-1");
    expect(redis.expire).toHaveBeenCalledWith(expect.stringContaining("ai:free:user-1:"), 48 * 60 * 60);
  });

  it("does not re-set the TTL on later uses", async () => {
    redis.incr.mockResolvedValue(4);
    await service.registerUse("user-1");
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("reports usage with a floored remaining count", async () => {
    redis.get.mockResolvedValue("25");
    await expect(service.getUsage("user-1")).resolves.toEqual({ used: 25, limit: 20, remaining: 0 });
  });

  it("buckets the counter key by calendar day", async () => {
    redis.incr.mockResolvedValue(2);
    await service.registerUse("user-1");
    const day = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(redis.incr).toHaveBeenCalledWith(`ai:free:user-1:${day}`);
  });
});
