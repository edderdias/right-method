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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReverseInvoicePayment } from "@/hooks/use-credit-cards";
import { formatBRL } from "@/lib/finance-format";
import type { CreditCardInvoice } from "@/types/credit-card";

interface ReverseInvoicePaymentDialogProps {
  cardId: string;
  invoice: CreditCardInvoice | null;
  onOpenChange: (open: boolean) => void;
}

const MIN_REASON_LENGTH = 3;

export function ReverseInvoicePaymentDialog({
  cardId,
  invoice,
  onOpenChange,
}: ReverseInvoicePaymentDialogProps) {
  const [reason, setReason] = useState("");
  const reverseInvoicePayment = useReverseInvoicePayment();
  const trimmedReason = reason.trim();

  function handleConfirm() {
    if (!invoice || trimmedReason.length < MIN_REASON_LENGTH) return;
    reverseInvoicePayment.mutate(
      { cardId, invoiceId: invoice.id, input: { reason: trimmedReason } },
      {
        onSuccess: () => {
          setReason("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={Boolean(invoice)}
      onOpenChange={(open) => {
        if (!open) setReason("");
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Estornar pagamento</DialogTitle>
          <DialogDescription>
            {invoice
              ? `O valor de ${formatBRL(invoice.paidAmount)} voltará para a conta de origem e a fatura será reaberta.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reversal-reason">Motivo do estorno</Label>
          <Textarea
            id="reversal-reason"
            placeholder="Explique por que este pagamento está sendo estornado"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reverseInvoicePayment.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={trimmedReason.length < MIN_REASON_LENGTH || reverseInvoicePayment.isPending}
          >
            {reverseInvoicePayment.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Estornando...
              </>
            ) : (
              "Confirmar estorno"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
