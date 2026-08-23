import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getViewAsUserId, setViewAsUserId, subscribeViewAsUserId } from "@/lib/api-client";
import { useFamilyAccess } from "@/hooks/use-family";

export function useFamilyView() {
  const queryClient = useQueryClient();
  const viewAsUserId = useSyncExternalStore(subscribeViewAsUserId, getViewAsUserId, () => null);
  const { data: access } = useFamilyAccess();

  const viewingOwner = access?.find((grant) => grant.ownerId === viewAsUserId)?.owner ?? null;

  function switchTo(userId: string | null) {
    setViewAsUserId(userId);
    void queryClient.invalidateQueries();
  }

  return {
    viewAsUserId,
    viewingOwner,
    accessibleAccounts: access ?? [],
    switchTo,
  };
}
