import { apiGet, apiPatch } from "@/lib/api-client";
import type { NotificationsResponse } from "@/types/notification";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function listNotifications(): Promise<NotificationsResponse> {
  const { data } = await apiGet<ApiEnvelope<NotificationsResponse>>("/notifications");
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch<ApiEnvelope<null>>(`/notifications/${id}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch<ApiEnvelope<null>>("/notifications/read-all", {});
}
