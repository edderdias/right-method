import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import { confirmTwoFactor, disableTwoFactor, setupTwoFactor } from "@/lib/two-factor-api";
import { currentUserKey } from "@/hooks/use-user-settings";

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: setupTwoFactor,
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useConfirmTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmTwoFactor,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
      toast.success("Autenticação em dois fatores ativada.");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDisableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
      toast.success("Autenticação em dois fatores desativada.");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
