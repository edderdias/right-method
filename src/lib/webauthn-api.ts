import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

import { apiDelete, apiPost } from "@/lib/api-client";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function getWebAuthnRegisterOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { data } = await apiPost<ApiEnvelope<PublicKeyCredentialCreationOptionsJSON>>(
    "/users/me/webauthn/register-options",
    {},
  );
  return data;
}

export async function verifyWebAuthnRegistration(
  response: RegistrationResponseJSON,
): Promise<{ biometricEnabled: boolean }> {
  const { data } = await apiPost<ApiEnvelope<{ biometricEnabled: boolean }>>(
    "/users/me/webauthn/register-verify",
    response,
  );
  return data;
}

export async function disableWebAuthn(): Promise<{ biometricEnabled: boolean }> {
  const { data } = await apiDelete<ApiEnvelope<{ biometricEnabled: boolean }>>(
    "/users/me/webauthn",
  );
  return data;
}
