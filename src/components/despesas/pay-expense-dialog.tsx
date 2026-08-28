import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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
import { useUpdateExpense } from "@/hooks/use-expenses";
import { useAccounts } from "@/hooks/use-revenues";
import { formatBRL, toISODateString } from "@/lib/finance-format";
import type { Expense } from "@/types/finance";

interface PayExpenseDialogProps {
  expense: Expense | null;
  onOpenChange: (open: boolean) => void;
}

export function PayExpenseDialog({ expense, onOpenChange }: PayExpenseDialogProps) {
  const accountsQuery = useAccounts();
  const updateExpense = useUpdateExpense();
  const accounts = accountsQuery.data ?? [];
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    setAccountId(expense?.accountId ?? "");
  }, [expense]);

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const insufficient =
    selectedAccount !== undefined && expense !== null && expense.amount > selectedAccount.balance;

  function handleConfirm() {
    if (!expense || !accountId) return;
    updateExpense.mutate(
      {
        id: expense.id,
        payload: { status: "PAID", accountId, paidAt: toISODateString(new Date()) },
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={Boolean(expense)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pagar despesa</DialogTitle>
          <DialogDescription>
            {expense
              ? `"${expense.description}" — ${formatBRL(expense.amount)} será debitado da conta escolhida.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {accounts.length > 0 ? (
          <div className="space-y-2">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} · {formatBRL(account.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {insufficient && (
              <p className="flex items-center gap-2 rounded-lg bg-warning/12 p-3 text-xs text-foreground">
                <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                Saldo insuficiente em {selectedAccount?.name} ({formatBRL(selectedAccount?.balance ?? 0)}).
                A conta ficará negativa.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você ainda não possui contas cadastradas para registrar o pagamento.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateExpense.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!accountId || updateExpense.isPending}
            className="bg-gradient-brand font-semibold"
          >
            {updateExpense.isPending ? (
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
