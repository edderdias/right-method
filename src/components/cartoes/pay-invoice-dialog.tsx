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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-revenues";
import { usePayInvoice } from "@/hooks/use-credit-cards";
import { formatBRL } from "@/lib/finance-format";
import type { CreditCardInvoice } from "@/types/credit-card";

interface PayInvoiceDialogProps {
  cardId: string;
  invoice: CreditCardInvoice | null;
  onOpenChange: (open: boolean) => void;
}

export function PayInvoiceDialog({ cardId, invoice, onOpenChange }: PayInvoiceDialogProps) {
  const [accountId, setAccountId] = useState<string>("");
  const accountsQuery = useAccounts();
  const payInvoice = usePayInvoice();
  const accounts = accountsQuery.data ?? [];

  function handleConfirm() {
    if (!invoice || !accountId) return;
    payInvoice.mutate(
      { cardId, invoiceId: invoice.id, input: { accountId } },
      {
        onSuccess: () => {
          setAccountId("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={Boolean(invoice)}
      onOpenChange={(open) => {
        if (!open) setAccountId("");
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            {invoice
              ? `O valor de ${formatBRL(invoice.totalAmount)} será debitado da conta selecionada.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {accounts.length > 0 ? (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a conta de origem" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} · {formatBRL(account.balance)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você ainda não possui contas cadastradas para pagar a fatura.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={payInvoice.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!accountId || payInvoice.isPending}
            className="bg-gradient-brand font-semibold"
          >
            {payInvoice.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Pagando...
              </>
            ) : (
              "Confirmar pagamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
