import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDisconnectAccount } from "@/hooks/use-open-finance";
import type { ConnectedAccount } from "@/types/open-finance";

interface DisconnectAccountDialogProps {
  account: ConnectedAccount | null;
  onOpenChange: (open: boolean) => void;
}

export function DisconnectAccountDialog({ account, onOpenChange }: DisconnectAccountDialogProps) {
  const [deleteHistory, setDeleteHistory] = useState(false);
  const disconnectAccount = useDisconnectAccount();

  function handleConfirm() {
    if (!account) return;
    disconnectAccount.mutate(
      { id: account.id, keepHistory: !deleteHistory },
      {
        onSuccess: () => {
          setDeleteHistory(false);
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={Boolean(account)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Desconectar conta?</DialogTitle>
          <DialogDescription>
            A partir da desconexão, o Método Certo não receberá novas movimentações de{" "}
            {account?.marketingName ?? account?.name} através do Open Finance.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={deleteHistory}
            onCheckedChange={(value) => setDeleteHistory(value === true)}
          />
          Também excluir o histórico de movimentações já importado
        </label>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disconnectAccount.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={disconnectAccount.isPending}
          >
            {disconnectAccount.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Desconectando...
              </>
            ) : (
              "Desconectar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
