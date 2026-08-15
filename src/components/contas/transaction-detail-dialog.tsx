import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { useUpdateTransaction } from "@/hooks/use-open-finance";
import { formatBRL, formatDateTime, formatShortDate } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/finance";
import type { BankTransaction } from "@/types/open-finance";

const NO_CATEGORY = "none";

interface TransactionDetailDialogProps {
  transaction: BankTransaction | null;
  categories: Category[];
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({
  transaction,
  categories,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [notes, setNotes] = useState("");
  const updateTransaction = useUpdateTransaction();

  useEffect(() => {
    setCategoryId(transaction?.categoryId ?? NO_CATEGORY);
    setNotes(transaction?.notes ?? "");
  }, [transaction]);

  function handleSave() {
    if (!transaction) return;
    updateTransaction.mutate(
      {
        id: transaction.id,
        payload: { categoryId: categoryId === NO_CATEGORY ? null : categoryId, notes },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={Boolean(transaction)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da movimentação</DialogTitle>
        </DialogHeader>

        {transaction && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p className="text-sm font-medium">{transaction.description}</p>
              {transaction.merchantName && (
                <p className="text-xs text-muted-foreground">{transaction.merchantName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    transaction.type === "CREDIT" ? "text-primary" : "text-foreground",
                  )}
                >
                  {transaction.type === "CREDIT" ? "+" : "−"}
                  {formatBRL(transaction.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm font-medium">
                  {formatShortDate(transaction.transactionDate)}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">Categoria</p>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">Observações</p>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Adicione uma observação (opcional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <p>Origem</p>
                <p className="font-medium text-foreground">Open Finance</p>
              </div>
              <div>
                <p>Importado em</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(transaction.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateTransaction.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateTransaction.isPending}>
            {updateTransaction.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
