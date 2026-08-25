import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { AiConversation, AiConversationDetail, SendAiMessageResult } from "@/types/ai";
import type { AiProvider } from "@/types/user";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export interface AiCredentialsStatus {
  provider: AiProvider;
  hasKey: boolean;
}

export async function getAiCredentialsStatus(): Promise<AiCredentialsStatus> {
  const { data } = await apiGet<ApiEnvelope<AiCredentialsStatus>>("/users/me/ai-credentials");
  return data;
}

export async function saveAiCredentials(
  provider: AiProvider,
  apiKey: string,
): Promise<AiCredentialsStatus> {
  const { data } = await apiPatch<ApiEnvelope<AiCredentialsStatus>>("/users/me/ai-credentials", {
    provider,
    apiKey,
  });
  return data;
}

export async function removeAiCredentials(): Promise<AiCredentialsStatus> {
  const { data } = await apiDelete<ApiEnvelope<AiCredentialsStatus>>("/users/me/ai-credentials");
  return data;
}

export async function listAiConversations(): Promise<AiConversation[]> {
  const { data } = await apiGet<ApiEnvelope<AiConversation[]>>("/ai/conversations");
  return data;
}

export async function createAiConversation(): Promise<AiConversation> {
  const { data } = await apiPost<ApiEnvelope<AiConversation>>("/ai/conversations", {});
  return data;
}

export async function getAiConversation(id: string): Promise<AiConversationDetail> {
  const { data } = await apiGet<ApiEnvelope<AiConversationDetail>>(`/ai/conversations/${id}`);
  return data;
}

export async function renameAiConversation(id: string, title: string): Promise<AiConversation> {
  const { data } = await apiPatch<ApiEnvelope<AiConversation>>(`/ai/conversations/${id}`, {
    title,
  });
  return data;
}

export async function deleteAiConversation(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<null>>(`/ai/conversations/${id}`);
}

export async function sendAiMessage(
  conversationId: string,
  message: string,
): Promise<SendAiMessageResult> {
  const { data } = await apiPost<ApiEnvelope<SendAiMessageResult>>(
    `/ai/conversations/${conversationId}/messages`,
    { message },
  );
  return data;
}
