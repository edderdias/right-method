import { VerificationTokenType } from "@prisma/client";
import { InvalidTokenException } from "../../../common/exceptions/app.exception";
import { TokenService } from "./token.service";
import { VerificationTokenService } from "./verification-token.service";

describe("VerificationTokenService", () => {
  let prisma: any;
  let tokenService: TokenService;
  let service: VerificationTokenService;

  beforeEach(() => {
    prisma = {
      verificationToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    tokenService = {
      generateOpaqueToken: jest.fn(() => ({ token: "plain-token", hash: "hashed-token" })),
      hash: jest.fn((t: string) => `hashed:${t}`),
    } as unknown as TokenService;
    service = new VerificationTokenService(prisma, tokenService);
  });

  it("invalidates previous unused tokens of the same type before issuing a new one", async () => {
    const token = await service.issue("user-1", VerificationTokenType.PASSWORD_RESET);

    expect(prisma.verificationToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", type: VerificationTokenType.PASSWORD_RESET, usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(prisma.verificationToken.create).toHaveBeenCalled();
    expect(token).toBe("plain-token");
  });

  it("rejects an unknown, expired, or already-used token", async () => {
    prisma.verificationToken.findFirst.mockResolvedValue(null);
    await expect(
      service.consume("nope", VerificationTokenType.EMAIL_VERIFICATION),
    ).rejects.toBeInstanceOf(InvalidTokenException);
  });

  it("marks a valid token as used and returns its record", async () => {
    const record = { id: "vt-1", userId: "user-1", usedAt: null };
    prisma.verificationToken.findFirst.mockResolvedValue(record);

    const result = await service.consume("good", VerificationTokenType.EMAIL_VERIFICATION);

    expect(prisma.verificationToken.update).toHaveBeenCalledWith({
      where: { id: "vt-1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(result).toBe(record);
  });

  it("cannot consume the same token twice (second lookup finds nothing, since usedAt is now set)", async () => {
    prisma.verificationToken.findFirst.mockResolvedValueOnce({ id: "vt-1", userId: "user-1" });
    await service.consume("good", VerificationTokenType.EMAIL_VERIFICATION);

    prisma.verificationToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.consume("good", VerificationTokenType.EMAIL_VERIFICATION),
    ).rejects.toBeInstanceOf(InvalidTokenException);
  });
});
