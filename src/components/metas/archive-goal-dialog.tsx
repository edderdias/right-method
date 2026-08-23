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
import { useArchiveFinancialGoal } from "@/hooks/use-financial-goals";
import type { FinancialGoal } from "@/types/financial-goal";

interface ArchiveGoalDialogProps {
  goal: FinancialGoal | null;
  onOpenChange: (open: boolean) => void;
  onArchived?: () => void;
}

export function ArchiveGoalDialog({ goal, onOpenChange, onArchived }: ArchiveGoalDialogProps) {
  const archiveGoal = useArchiveFinancialGoal();

  function handleConfirm() {
    if (!goal) return;
    archiveGoal.mutate(goal.id, {
      onSuccess: () => {
        onOpenChange(false);
        onArchived?.();
      },
    });
  }

  return (
    <Dialog open={Boolean(goal)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir meta?</DialogTitle>
          <DialogDescription>
            Se a meta tiver aportes ou retiradas registrados, ela será arquivada em vez de excluída
            — o histórico financeiro é sempre preservado. Uma meta sem nenhum lançamento é excluída
            definitivamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiveGoal.isPending}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={archiveGoal.isPending}>
            {archiveGoal.isPending ? (
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
