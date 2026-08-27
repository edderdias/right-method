import { useCurrentUser } from "@/hooks/use-user-settings";

interface MaskableAmountProps {
  value: string;
  className?: string;
}

/** Wraps an already-formatted currency string; renders a mask instead when the user has
 * "ocultar saldos" on. Reads `useCurrentUser()` directly — its React Query cache is already
 * shared app-wide, so no dedicated context/provider is needed to avoid refetching. */
export function MaskableAmount({ value, className }: MaskableAmountProps) {
  const { data: currentUser } = useCurrentUser();
  return <span className={className}>{currentUser?.hideBalances ? "••••••" : value}</span>;
}
