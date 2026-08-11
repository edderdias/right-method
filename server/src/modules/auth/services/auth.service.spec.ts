import { UserStatus, VerificationTokenType, type User } from "@prisma/client";
import {
  AccountBlockedException,
  AccountInactiveException,
  EmailAlreadyExistsException,
  EmailNotVerifiedException,
  InvalidCredentialsException,
  InvalidTokenException,
  TooManyAttemptsException,
} from "../../../common/exceptions/app.exception";
import { AuthService } from "./auth.service";

const metadata = { ipAddress: "127.0.0.1", userAgent: "jest" };

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    name: "Maria Silva",
    email: "maria@example.com",
    passwordHash: "hashed",
    emailVerified: true,
    status: UserStatus.ACTIVE,
    role: "USER",
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("AuthService", () => {
  let usersService: any;
  let sessionsService: any;
  let passwordService: any;
  let tokenService: any;
  let verificationTokenService: any;
  let emailService: any;
  let auditLogService: any;
  let loginLockoutService: any;
  let config: any;
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      toPublic: jest.fn((u: User) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: u.emailVerified,
        status: u.status,
        role: u.role,
        createdAt: u.createdAt,
      })),
    };
    sessionsService = {
      create: jest.fn(),
      findValidByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    passwordService = { hash: jest.fn(async (p: string) => `hashed:${p}`), verify: jest.fn() };
    tokenService = {
      hash: jest.fn((t: string) => `hash:${t}`),
      signAccessToken: jest.fn(() => "access-token"),
      generateOpaqueToken: jest.fn(() => ({ token: "refresh-token", hash: "hash:refresh-token" })),
      accessTokenExpiresInSeconds: 900,
      refreshTokenExpiresAt: new Date(Date.now() + 1000),
    };
    verificationTokenService = {
      issue: jest.fn(async () => "verification-token"),
      consume: jest.fn(),
    };
    emailService = {
      sendEmailVerification: jest.fn(),
      sendPasswordReset: jest.fn(),
      sendPasswordChanged: jest.fn(),
      sendNewLoginAlert: jest.fn(),
    };
    auditLogService = { record: jest.fn() };
    loginLockoutService = {
      assertNotLocked: jest.fn(),
      registerFailure: jest.fn(),
      reset: jest.fn(),
    };
    config = { get: jest.fn(() => "http://localhost:5173") };

    service = new AuthService(
      usersService,
      sessionsService,
      passwordService,
      tokenService,
      verificationTokenService,
      emailService,
      auditLogService,
      loginLockoutService,
      config,
    );
  });

  describe("register", () => {
    it("rejects a duplicate e-mail", async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());
      await expect(
        service.register(
          { name: "Maria", email: "maria@example.com", password: "Senha@123" },
          metadata,
        ),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it("creates the user, issues a verification token and sends the e-mail", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const created = buildUser({ status: UserStatus.PENDING, emailVerified: false });
      usersService.create.mockResolvedValue(created);

      const result = await service.register(
        { name: "Maria Silva", email: "maria@example.com", password: "Senha@123" },
        metadata,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "maria@example.com", passwordHash: "hashed:Senha@123" }),
      );
      expect(verificationTokenService.issue).toHaveBeenCalledWith(
        created.id,
        VerificationTokenType.EMAIL_VERIFICATION,
      );
      expect(emailService.sendEmailVerification).toHaveBeenCalled();
      expect(result.data.status).toBe(UserStatus.PENDING);
    });
  });

  describe("login", () => {
    it("refuses to proceed while the account is locked out", async () => {
      loginLockoutService.assertNotLocked.mockRejectedValue(new TooManyAttemptsException());
      await expect(
        service.login({ email: "maria@example.com", password: "x" }, metadata),
      ).rejects.toBeInstanceOf(TooManyAttemptsException);
      expect(usersService.findByEmail).not.toHaveBeenCalled();
    });

    it("rejects when the user does not exist, registering a failed attempt", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: "ghost@example.com", password: "x" }, metadata),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
      expect(loginLockoutService.registerFailure).toHaveBeenCalledWith(
        "ghost@example.com",
        metadata.ipAddress,
      );
    });

    it("rejects an incorrect password, registering a failed attempt", async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());
      passwordService.verify.mockResolvedValue(false);
      await expect(
        service.login({ email: "maria@example.com", password: "wrong" }, metadata),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
      expect(loginLockoutService.registerFailure).toHaveBeenCalled();
    });

    it("rejects a blocked account", async () => {
      usersService.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.BLOCKED }));
      passwordService.verify.mockResolvedValue(true);
      await expect(
        service.login({ email: "maria@example.com", password: "Senha@123" }, metadata),
      ).rejects.toBeInstanceOf(AccountBlockedException);
    });

    it("rejects an account pending e-mail verification", async () => {
      usersService.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.PENDING }));
      passwordService.verify.mockResolvedValue(true);
      await expect(
        service.login({ email: "maria@example.com", password: "Senha@123" }, metadata),
      ).rejects.toBeInstanceOf(EmailNotVerifiedException);
    });

    it("rejects an inactive account", async () => {
      usersService.findByEmail.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }));
      passwordService.verify.mockResolvedValue(true);
      await expect(
        service.login({ email: "maria@example.com", password: "Senha@123" }, metadata),
      ).rejects.toBeInstanceOf(AccountInactiveException);
    });

    it("issues tokens and resets the lockout counter on success", async () => {
      const user = buildUser();
      usersService.findByEmail.mockResolvedValue(user);
      passwordService.verify.mockResolvedValue(true);

      const result = await service.login({ email: user.email, password: "Senha@123" }, metadata);

      expect(loginLockoutService.reset).toHaveBeenCalledWith(user.email, metadata.ipAddress);
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(user.id);
      expect(sessionsService.create).toHaveBeenCalled();
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(result.expiresIn).toBe(900);
    });
  });

  describe("refresh", () => {
    it("rejects an unknown or expired refresh token", async () => {
      sessionsService.findValidByHash.mockResolvedValue(null);
      await expect(service.refresh("bogus", metadata)).rejects.toBeInstanceOf(
        InvalidTokenException,
      );
    });

    it("revokes the session and rejects if the owning user is no longer active", async () => {
      sessionsService.findValidByHash.mockResolvedValue({ id: "session-1", userId: "user-1" });
      usersService.findById.mockResolvedValue(buildUser({ status: UserStatus.BLOCKED }));

      await expect(service.refresh("token", metadata)).rejects.toBeInstanceOf(
        InvalidCredentialsException,
      );
      expect(sessionsService.revoke).toHaveBeenCalledWith("session-1");
    });

    it("rotates the refresh token on success", async () => {
      const user = buildUser();
      sessionsService.findValidByHash.mockResolvedValue({ id: "session-1", userId: user.id });
      usersService.findById.mockResolvedValue(user);

      const result = await service.refresh("old-token", metadata);

      expect(sessionsService.revoke).toHaveBeenCalledWith("session-1");
      expect(sessionsService.create).toHaveBeenCalled();
      expect(result.refreshToken).toBe("refresh-token");
    });
  });

  describe("logout / logoutAll", () => {
    it("revokes the session only when it belongs to the requesting user", async () => {
      sessionsService.findValidByHash.mockResolvedValue({ id: "session-1", userId: "user-1" });
      await service.logout("user-1", "token", metadata);
      expect(sessionsService.revoke).toHaveBeenCalledWith("session-1");
    });

    it("does not revoke a session belonging to a different user", async () => {
      sessionsService.findValidByHash.mockResolvedValue({
        id: "session-1",
        userId: "someone-else",
      });
      await service.logout("user-1", "token", metadata);
      expect(sessionsService.revoke).not.toHaveBeenCalled();
    });

    it("revokes every session for logout-all", async () => {
      await service.logoutAll("user-1", metadata);
      expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("resetPassword", () => {
    it("propagates an invalid/expired token error", async () => {
      verificationTokenService.consume.mockRejectedValue(new InvalidTokenException());
      await expect(service.resetPassword("bad", "Nova@123", metadata)).rejects.toBeInstanceOf(
        InvalidTokenException,
      );
    });

    it("updates the password and revokes every session", async () => {
      verificationTokenService.consume.mockResolvedValue({
        id: "vt-1",
        userId: "user-1",
        type: VerificationTokenType.PASSWORD_RESET,
      });
      usersService.updatePassword.mockResolvedValue(buildUser());

      await service.resetPassword("good-token", "Nova@123", metadata);

      expect(usersService.updatePassword).toHaveBeenCalledWith("user-1", "hashed:Nova@123");
      expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith("user-1");
      expect(emailService.sendPasswordChanged).toHaveBeenCalled();
    });
  });
});
