import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useDeletePurchase } from "@/hooks/use-credit-cards";
import type { CreditCardPurchase, RemovePurchaseScope } from "@/types/credit-card";

interface DeletePurchaseDialogProps {
  purchase: CreditCardPurchase | null;
  onOpenChange: (open: boolean) => void;
}

export function DeletePurchaseDialog({ purchase, onOpenChange }: DeletePurchaseDialogProps) {
  const [scope, setScope] = useState<RemovePurchaseScope>("one");
  const deletePurchase = useDeletePurchase();
  const isInstallment = Boolean(purchase?.installmentGroupId);

  function handleConfirm() {
    if (!purchase) return;
    deletePurchase.mutate(
      { id: purchase.id, cardId: purchase.cardId, scope: isInstallment ? scope : "one" },
      {
        onSuccess: () => {
          setScope("one");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={Boolean(purchase)}
      onOpenChange={(open) => {
        if (!open) setScope("one");
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir compra?</DialogTitle>
          <DialogDescription>
            {isInstallment
              ? `Esta compra possui ${purchase?.installmentTotal ?? "várias"} parcelas.`
              : "Essa ação não poderá ser desfeita."}
          </DialogDescription>
        </DialogHeader>

        {isInstallment && (
          <RadioGroup
            value={scope}
            onValueChange={(value) => setScope(value as RemovePurchaseScope)}
          >
            <label className="flex items-center gap-2 rounded-lg border border-input p-3 text-sm">
              <RadioGroupItem value="one" id="scope-one" />
              <Label htmlFor="scope-one" className="cursor-pointer font-normal">
                Excluir somente esta parcela
              </Label>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-input p-3 text-sm">
              <RadioGroupItem value="group" id="scope-group" />
              <Label htmlFor="scope-group" className="cursor-pointer font-normal">
                Excluir toda a compra parcelada
              </Label>
            </label>
          </RadioGroup>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deletePurchase.isPending}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deletePurchase.isPending}>
            {deletePurchase.isPending ? (
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
