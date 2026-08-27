import { IsObject, IsString } from "class-validator";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

export class VerifyWebAuthnLoginDto {
  @IsString()
  ceremonyId!: string;

  /** The deep shape is verified cryptographically by @simplewebauthn's verify function, not
   * class-validator — @IsObject() only exists so the global whitelist ValidationPipe doesn't
   * strip this property for having no decorators. */
  @IsObject()
  response!: AuthenticationResponseJSON;
}
