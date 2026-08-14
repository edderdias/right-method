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
import { useDeleteRevenue } from "@/hooks/use-revenues";
import type { Revenue } from "@/types/finance";

interface DeleteRevenueDialogProps {
  revenue: Revenue | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteRevenueDialog({ revenue, onOpenChange }: DeleteRevenueDialogProps) {
  const deleteRevenue = useDeleteRevenue();

  function handleConfirm() {
    if (!revenue) return;
    deleteRevenue.mutate(revenue.id, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={Boolean(revenue)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir receita?</DialogTitle>
          <DialogDescription>Essa ação não poderá ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteRevenue.isPending}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteRevenue.isPending}>
            {deleteRevenue.isPending ? (
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
