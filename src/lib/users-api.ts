import { apiGet, apiPatch } from "@/lib/api-client";
import type {
  NotificationPreferences,
  SecurityPreferences,
  UpdateProfileInput,
  UserProfile,
} from "@/types/user";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data } = await apiGet<ApiEnvelope<UserProfile | null>>("/auth/me");
  return data;
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const { data } = await apiPatch<ApiEnvelope<UserProfile>>("/users/me", input);
  return data;
}

export async function updateNotificationPreferences(
  input: Partial<NotificationPreferences>,
): Promise<UserProfile> {
  const { data } = await apiPatch<ApiEnvelope<UserProfile>>("/users/me/notifications", input);
  return data;
}

export async function updateSecurityPreferences(
  input: Partial<SecurityPreferences>,
): Promise<UserProfile> {
  const { data } = await apiPatch<ApiEnvelope<UserProfile>>("/users/me/security", input);
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiPatch<{ message: string }>("/auth/password", { currentPassword, newPassword });
}
