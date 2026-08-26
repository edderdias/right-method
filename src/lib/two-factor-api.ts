import { apiDelete, apiPost } from "@/lib/api-client";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export interface TwoFactorSetup {
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  const { data } = await apiPost<ApiEnvelope<TwoFactorSetup>>("/users/me/2fa/setup", {});
  return data;
}

export async function confirmTwoFactor(code: string): Promise<{ twoFactorEnabled: boolean }> {
  const { data } = await apiPost<ApiEnvelope<{ twoFactorEnabled: boolean }>>(
    "/users/me/2fa/confirm",
    { code },
  );
  return data;
}

export async function disableTwoFactor(): Promise<{ twoFactorEnabled: boolean }> {
  const { data } = await apiDelete<ApiEnvelope<{ twoFactorEnabled: boolean }>>("/users/me/2fa");
  return data;
}
