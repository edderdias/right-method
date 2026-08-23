import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createAiConversation,
  deleteAiConversation,
  getAiConversation,
  getOpenAiKeyStatus,
  listAiConversations,
  removeOpenAiKey,
  renameAiConversation,
  saveOpenAiKey,
  sendAiMessage,
} from "@/lib/ai-api";
import type { AiConversationDetail } from "@/types/ai";

export const aiKeys = {
  conversations: ["ai", "conversations"] as const,
  conversation: (id: string) => ["ai", "conversations", id] as const,
  openAiKeyStatus: ["ai", "openai-key"] as const,
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

export function useOpenAiKeyStatus() {
  return useQuery({ queryKey: aiKeys.openAiKeyStatus, queryFn: getOpenAiKeyStatus });
}

export function useSaveOpenAiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveOpenAiKey,
    onSuccess: (data) => {
      queryClient.setQueryData(aiKeys.openAiKeyStatus, data);
      toast.success("Chave da OpenAI salva com sucesso.");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRemoveOpenAiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeOpenAiKey,
    onSuccess: (data) => {
      queryClient.setQueryData(aiKeys.openAiKeyStatus, data);
      toast.success("Chave da OpenAI removida.");
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
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
