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
import { useArchiveCreditCard } from "@/hooks/use-credit-cards";
import type { CreditCard } from "@/types/credit-card";

interface ArchiveCreditCardDialogProps {
  card: CreditCard | null;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
}

export function ArchiveCreditCardDialog({
  card,
  onOpenChange,
  onArchived,
}: ArchiveCreditCardDialogProps) {
  const archiveCard = useArchiveCreditCard();

  function handleConfirm() {
    if (!card) return;
    archiveCard.mutate(card.id, {
      onSuccess: () => {
        onOpenChange(false);
        onArchived?.();
      },
    });
  }

  return (
    <Dialog open={Boolean(card)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir cartão?</DialogTitle>
          <DialogDescription>
            Se o cartão tiver faturas ou compras registradas, ele será arquivado em vez de excluído
            — o histórico financeiro é sempre preservado. Um cartão sem nenhum lançamento é excluído
            definitivamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiveCard.isPending}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={archiveCard.isPending}>
            {archiveCard.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Processando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
