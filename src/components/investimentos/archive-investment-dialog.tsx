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
import { useArchiveInvestment } from "@/hooks/use-investments";
import type { Investment } from "@/types/investment";

interface ArchiveInvestmentDialogProps {
  investment: Investment | null;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
}

export function ArchiveInvestmentDialog({
  investment,
  onOpenChange,
  onArchived,
}: ArchiveInvestmentDialogProps) {
  const archiveInvestment = useArchiveInvestment();

  function handleConfirm() {
    if (!investment) return;
    archiveInvestment.mutate(investment.id, {
      onSuccess: () => {
        onOpenChange(false);
        onArchived?.();
      },
    });
  }

  return (
    <Dialog open={Boolean(investment)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir investimento?</DialogTitle>
          <DialogDescription>
            Se o investimento tiver aportes, resgates ou rendimentos registrados, ele será arquivado
            em vez de excluído — o histórico financeiro é sempre preservado. Um investimento sem
            nenhum lançamento é excluído definitivamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiveInvestment.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={archiveInvestment.isPending}
          >
            {archiveInvestment.isPending ? (
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
