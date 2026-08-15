import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useCreateConnectToken, useCreateConnection } from "@/hooks/use-open-finance";
import { openPluggyConnect } from "@/lib/pluggy-connect";
import type { RegisterConnectionResponse } from "@/types/open-finance";
import { SelectAccountsDialog } from "./select-accounts-dialog";

interface PluggyConnectButtonProps extends Pick<ButtonProps, "variant" | "size" | "className"> {
  /** Set when reconnecting/renewing an existing item (spec section 30). */
  reconnectItemId?: string;
  label?: string;
}

export function PluggyConnectButton({
  reconnectItemId,
  label = "Conectar conta",
  variant,
  size,
  className,
}: PluggyConnectButtonProps) {
  const createConnectToken = useCreateConnectToken();
  const createConnection = useCreateConnection();
  const [opening, setOpening] = useState(false);
  const [registration, setRegistration] = useState<RegisterConnectionResponse | null>(null);

  async function handleClick() {
    setOpening(true);
    try {
      const accessToken = await createConnectToken.mutateAsync(reconnectItemId);
      openPluggyConnect({
        connectToken: accessToken,
        ...(reconnectItemId ? { updateItemId: reconnectItemId } : {}),
        onSuccess: (itemId) => {
          createConnection.mutate(itemId, {
            onSuccess: (result) => {
              if (result.availableAccounts.length === 0) {
                toast.info("Nenhuma conta nova encontrada para importar.");
                return;
              }
              setRegistration(result);
            },
            onSettled: () => setOpening(false),
          });
        },
        onError: () => setOpening(false),
        onClose: () => setOpening(false),
      });
    } catch {
      setOpening(false);
    }
  }

  const pending = opening || createConnectToken.isPending;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
        {label}
      </Button>
      <SelectAccountsDialog
        registration={registration}
        onOpenChange={(open) => {
          if (!open) setRegistration(null);
        }}
      />
    </>
  );
}
