import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createFamilyInvite,
  getActiveFamilyInvite,
  listFamilyAccess,
  listFamilyMembers,
  redeemFamilyInvite,
  revokeFamilyGrant,
  revokeFamilyInvite,
} from "@/lib/family-api";

export const familyKeys = {
  activeInvite: ["family", "invites", "active"] as const,
  members: ["family", "members"] as const,
  access: ["family", "access"] as const,
};

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useActiveFamilyInvite() {
  return useQuery({ queryKey: familyKeys.activeInvite, queryFn: getActiveFamilyInvite });
}

export function useFamilyMembers() {
  return useQuery({ queryKey: familyKeys.members, queryFn: listFamilyMembers });
}

export function useFamilyAccess() {
  return useQuery({ queryKey: familyKeys.access, queryFn: listFamilyAccess });
}

export function useCreateFamilyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFamilyInvite,
    onSuccess: () => {
      toast.success("Novo código de convite gerado!");
      void queryClient.invalidateQueries({ queryKey: familyKeys.activeInvite });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRevokeFamilyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeFamilyInvite(id),
    onSuccess: () => {
      toast.success("Convite revogado.");
      void queryClient.invalidateQueries({ queryKey: familyKeys.activeInvite });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRedeemFamilyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => redeemFamilyInvite(code),
    onSuccess: () => {
      toast.success("Convite resgatado! Você agora pode visualizar essa conta.");
      void queryClient.invalidateQueries({ queryKey: familyKeys.access });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRevokeFamilyGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeFamilyGrant(id),
    onSuccess: () => {
      toast.success("Acesso compartilhado revogado.");
      void queryClient.invalidateQueries({ queryKey: familyKeys.members });
      void queryClient.invalidateQueries({ queryKey: familyKeys.access });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
