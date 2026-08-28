import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteAccount } from "@/hooks/use-revenues";
import type { Account } from "@/types/finance";

interface DeleteManualAccountDialogProps {
  account: Account | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteManualAccountDialog({
  account,
  onOpenChange,
}: DeleteManualAccountDialogProps) {
  const deleteAccount = useDeleteAccount();

  function handleConfirm() {
    if (!account) return;
    deleteAccount.mutate(account.id, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={Boolean(account)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir conta?</DialogTitle>
          <DialogDescription>
            {account
              ? `A conta "${account.name}" será removida. Isso só é possível se não houver receitas, despesas ou transferências vinculadas a ela.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteAccount.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
