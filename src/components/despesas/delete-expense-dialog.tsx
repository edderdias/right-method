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
import { useDeleteExpense } from "@/hooks/use-expenses";
import type { Expense } from "@/types/finance";

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteExpenseDialog({ expense, onOpenChange }: DeleteExpenseDialogProps) {
  const deleteExpense = useDeleteExpense();

  function handleConfirm() {
    if (!expense) return;
    deleteExpense.mutate(expense.id, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={Boolean(expense)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir despesa?</DialogTitle>
          <DialogDescription>Essa ação não poderá ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteExpense.isPending}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteExpense.isPending}>
            {deleteExpense.isPending ? (
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
