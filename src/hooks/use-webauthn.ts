import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import { currentUserKey } from "@/hooks/use-user-settings";
import {
  disableWebAuthn,
  getWebAuthnRegisterOptions,
  verifyWebAuthnRegistration,
} from "@/lib/webauthn-api";

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

/** Runs the full registration ceremony: fetch options, prompt the browser's WebAuthn UI, then
 * verify the response — a single mutation so the Settings switch can call one thing. */
export function useEnableBiometric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const options = await getWebAuthnRegisterOptions();
      const response = await startRegistration({ optionsJSON: options });
      return verifyWebAuthnRegistration(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
      toast.success("Biometria ativada com sucesso.");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDisableBiometric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disableWebAuthn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
      toast.success("Biometria desativada.");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
