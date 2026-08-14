import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExpenseForm,
  expenseFormValuesToPayload,
  type ExpenseFormValues,
} from "@/components/despesas/expense-form";
import { useCreateExpense, useUpdateExpense } from "@/hooks/use-expenses";
import type { Expense } from "@/types/finance";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEditing = Boolean(expense);
  const submitting = createExpense.isPending || updateExpense.isPending;

  function handleSubmit(values: ExpenseFormValues) {
    const payload = expenseFormValuesToPayload(values);

    if (expense) {
      updateExpense.mutate({ id: expense.id, payload }, { onSuccess: () => onOpenChange(false) });
      return;
    }

    createExpense.mutate(payload, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar despesa" : "Nova despesa"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da despesa selecionada."
              : "Preencha os dados para cadastrar uma nova despesa."}
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          key={expense?.id ?? "create"}
          expense={expense}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
