import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createAiConversation,
  deleteAiConversation,
  getAiConversation,
  getAiCredentialsStatus,
  getAiFreeTierStatus,
  listAiConversations,
  removeAiCredentials,
  renameAiConversation,
  saveAiCredentials,
  sendAiMessage,
} from "@/lib/ai-api";
import type { AiConversationDetail } from "@/types/ai";
import type { AiProvider } from "@/types/user";

export const aiKeys = {
  conversations: ["ai", "conversations"] as const,
  conversation: (id: string) => ["ai", "conversations", id] as const,
  credentialsStatus: ["ai", "credentials"] as const,
  freeTierStatus: ["ai", "free-tier"] as const,
};

const GENERIC_ERROR_MESSAGE = "Não foi possível falar com o Certo IA agora. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useAiConversations() {
  return useQuery({ queryKey: aiKeys.conversations, queryFn: listAiConversations });
}

export function useAiConversation(id: string | null) {
  return useQuery({
    queryKey: aiKeys.conversation(id ?? ""),
    queryFn: () => getAiConversation(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAiConversation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.conversations });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRenameAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameAiConversation(id, title),
    onSuccess: (_conversation, variables) => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: aiKeys.conversation(variables.id) });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDeleteAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAiConversation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.conversations });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useAiCredentialsStatus() {
  return useQuery({ queryKey: aiKeys.credentialsStatus, queryFn: getAiCredentialsStatus });
}

export function useAiFreeTierStatus() {
  return useQuery({ queryKey: aiKeys.freeTierStatus, queryFn: getAiFreeTierStatus });
}

export function useSaveAiCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: AiProvider; apiKey: string }) =>
      saveAiCredentials(provider, apiKey),
    onSuccess: (data) => {
      queryClient.setQueryData(aiKeys.credentialsStatus, data);
      void queryClient.invalidateQueries({ queryKey: aiKeys.freeTierStatus });
      toast.success("Credenciais de IA salvas com sucesso.");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRemoveAiCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeAiCredentials,
    onSuccess: (data) => {
      queryClient.setQueryData(aiKeys.credentialsStatus, data);
      void queryClient.invalidateQueries({ queryKey: aiKeys.freeTierStatus });
      toast.success("Credenciais de IA removidas.");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useSendAiMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, message }: { conversationId: string; message: string }) =>
      sendAiMessage(conversationId, message),
    onSuccess: (result, variables) => {
      queryClient.setQueryData<AiConversationDetail | undefined>(
        aiKeys.conversation(variables.conversationId),
        (current) =>
          current
            ? {
                ...current,
                messages: [...current.messages, result.userMessage, result.assistantMessage],
              }
            : current,
      );
      void queryClient.invalidateQueries({ queryKey: aiKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: aiKeys.freeTierStatus });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
