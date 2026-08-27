import { redirect } from "@tanstack/react-router";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

import { apiPost, clearSession, getAccessToken, setSessionTokens } from "@/lib/api-client";

export { clearSession, getAccessToken } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginResponse {
  message: string;
  data: AuthTokens & { user: AuthUser };
}

interface LoginApiResponse {
  message: string;
  data: (AuthTokens & { user: AuthUser }) | { requires2FA: true; challengeToken: string };
}

export type LoginResult =
  | { requires2FA: false; user: AuthUser }
  | { requires2FA: true; challengeToken: string };

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await apiPost<LoginApiResponse>("/auth/login", { email, password });
  if ("requires2FA" in data) {
    return data;
  }
  setSessionTokens(data);
  return { requires2FA: false, user: data.user };
}

export async function verifyTwoFactorLogin(
  challengeToken: string,
  code: string,
): Promise<AuthUser> {
  const { data } = await apiPost<LoginResponse>("/auth/2fa/verify", { challengeToken, code });
  setSessionTokens(data);
  return data.user;
}

interface WebAuthnLoginOptionsResponse {
  message: string;
  data: { options: PublicKeyCredentialRequestOptionsJSON; ceremonyId: string };
}

export async function getWebAuthnLoginOptions(): Promise<{
  options: PublicKeyCredentialRequestOptionsJSON;
  ceremonyId: string;
}> {
  const { data } = await apiPost<WebAuthnLoginOptionsResponse>("/auth/webauthn/login-options", {});
  return data;
}

export async function verifyWebAuthnLogin(
  ceremonyId: string,
  response: AuthenticationResponseJSON,
): Promise<AuthUser> {
  const { data } = await apiPost<LoginResponse>("/auth/webauthn/login-verify", {
    ceremonyId,
    response,
  });
  setSessionTokens(data);
  return data.user;
}

interface RegisterResponse {
  message: string;
}

export async function register(name: string, email: string, password: string): Promise<string> {
  const { message } = await apiPost<RegisterResponse>("/auth/register", { name, email, password });
  return message;
}

export async function verifyEmail(token: string): Promise<string> {
  const { message } = await apiPost<RegisterResponse>("/auth/verify-email", { token });
  return message;
}

export async function resendVerification(email: string): Promise<string> {
  const { message } = await apiPost<RegisterResponse>("/auth/resend-verification", { email });
  return message;
}

export async function logoutAllSessions(): Promise<string> {
  const { message } = await apiPost<RegisterResponse>("/auth/logout-all", {});
  clearSession();
  return message;
}

export function requireAuth(): void {
  if (typeof window !== "undefined" && !isAuthenticated()) {
    throw redirect({ to: "/" });
  }
}
