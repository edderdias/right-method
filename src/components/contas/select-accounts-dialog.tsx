import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSelectAccounts } from "@/hooks/use-open-finance";
import { formatBRL } from "@/lib/finance-format";
import type { RegisterConnectionResponse } from "@/types/open-finance";

interface SelectAccountsDialogProps {
  registration: RegisterConnectionResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function SelectAccountsDialog({ registration, onOpenChange }: SelectAccountsDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAccounts = useSelectAccounts();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirm() {
    if (!registration || selected.size === 0) return;
    selectAccounts.mutate(
      { connectionId: registration.connection.id, externalAccountIds: Array.from(selected) },
      {
        onSuccess: () => {
          setSelected(new Set());
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={Boolean(registration)}
      onOpenChange={(open) => {
        if (!open) setSelected(new Set());
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione as contas</DialogTitle>
          <DialogDescription>
            Escolha quais contas de {registration?.connection.institutionName} deseja importar para
            o Método Certo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {registration?.availableAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta nova disponível para importar.
            </p>
          ) : (
            registration?.availableAccounts.map((account) => (
              <label
                key={account.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/70 p-3"
              >
                <Checkbox
                  checked={selected.has(account.id)}
                  onCheckedChange={() => toggle(account.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {account.marketingName ?? account.name}
                  </p>
                  <p className="text-xs text-muted-foreground">•••• {account.number.slice(-4)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{formatBRL(account.balance)}</span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={selectAccounts.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.size === 0 || selectAccounts.isPending}
          >
            {selectAccounts.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Importando...
              </>
            ) : (
              "Importar contas"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
