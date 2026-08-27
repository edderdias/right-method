import { randomBytes } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import { AppConfigService } from "../../config/app-config.service";
import { REDIS_CLIENT } from "../../database/redis.module";
import {
  WebAuthnChallengeMissingException,
  WebAuthnVerificationFailedException,
} from "../../common/exceptions/app.exception";
import { UsersService } from "./users.service";

const CHALLENGE_TTL_SECONDS = 5 * 60;
const RP_NAME = "Método Certo";

@Injectable()
export class WebAuthnService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly usersService: UsersService,
    private readonly config: AppConfigService,
  ) {}

  private rpID(): string {
    return new URL(this.config.get("FRONTEND_URL")).hostname;
  }

  private origin(): string {
    return this.config.get("FRONTEND_URL").replace(/\/$/, "");
  }

  async generateRegistrationOptions(userId: string, email: string) {
    const existing = await this.usersService.listWebAuthnCredentials(userId);
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: this.rpID(),
      userName: email,
      userID: isoUint8Array.fromUTF8String(userId),
      attestationType: "none",
      excludeCredentials: existing.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    });

    await this.redis.set(`webauthn-reg:${userId}`, options.challenge, "EX", CHALLENGE_TTL_SECONDS);
    return options;
  }

  async verifyRegistration(userId: string, response: RegistrationResponseJSON): Promise<void> {
    const challenge = await this.redis.get(`webauthn-reg:${userId}`);
    if (!challenge) {
      throw new WebAuthnChallengeMissingException();
    }
    await this.redis.del(`webauthn-reg:${userId}`);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origin(),
      expectedRPID: this.rpID(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new WebAuthnVerificationFailedException();
    }

    const { credential } = verification.registrationInfo;
    await this.usersService.addWebAuthnCredential(userId, {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
    });
  }

  /** Discoverable/passkey flow — no email needed upfront. The browser lets the user pick from
   * whichever passkeys it has for this origin, identified afterwards via the response's
   * userHandle rather than an allowCredentials list. */
  async generateLoginOptions(): Promise<{
    options: PublicKeyCredentialRequestOptionsJSON;
    ceremonyId: string;
  }> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID(),
      userVerification: "preferred",
    });

    const ceremonyId = randomBytes(16).toString("hex");
    await this.redis.set(
      `webauthn-login:${ceremonyId}`,
      options.challenge,
      "EX",
      CHALLENGE_TTL_SECONDS,
    );
    return { options, ceremonyId };
  }

  async verifyLogin(ceremonyId: string, response: AuthenticationResponseJSON): Promise<string> {
    const challenge = await this.redis.get(`webauthn-login:${ceremonyId}`);
    if (!challenge) {
      throw new WebAuthnChallengeMissingException();
    }
    await this.redis.del(`webauthn-login:${ceremonyId}`);

    const userHandle = response.response.userHandle;
    if (!userHandle) {
      throw new WebAuthnVerificationFailedException();
    }
    const userId = isoBase64URL.toUTF8String(userHandle);

    const stored = await this.usersService.findWebAuthnCredentialByCredentialId(response.id);
    if (!stored || stored.userId !== userId) {
      throw new WebAuthnVerificationFailedException();
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origin(),
      expectedRPID: this.rpID(),
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey),
        counter: Number(stored.counter),
        transports: stored.transports as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) {
      throw new WebAuthnVerificationFailedException();
    }

    await this.usersService.updateWebAuthnCredentialCounter(
      stored.credentialId,
      verification.authenticationInfo.newCounter,
    );

    return userId;
  }
}
