import { redirect } from "@tanstack/react-router";

import { apiPost } from "@/lib/api-client";

const ACCESS_TOKEN_KEY = "mc_access_token";
const REFRESH_TOKEN_KEY = "mc_refresh_token";

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

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiPost<LoginResponse>("/auth/login", { email, password });
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
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
