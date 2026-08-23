import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  changePassword,
  getCurrentUser,
  updateNotificationPreferences,
  updateProfile,
  updateSecurityPreferences,
} from "@/lib/users-api";
import type {
  NotificationPreferences,
  SecurityPreferences,
  UpdateProfileInput,
} from "@/types/user";

export const currentUserKey = ["auth", "me"] as const;

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useCurrentUser() {
  return useQuery({ queryKey: currentUserKey, queryFn: getCurrentUser });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<NotificationPreferences>) => updateNotificationPreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateSecurityPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SecurityPreferences>) => updateSecurityPreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changePassword(currentPassword, newPassword),
    onSuccess: (result) => toast.success(result.message),
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
