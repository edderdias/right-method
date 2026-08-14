import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RevenueForm,
  revenueFormValuesToPayload,
  type RevenueFormValues,
} from "@/components/receitas/revenue-form";
import { useCreateRevenue, useUpdateRevenue } from "@/hooks/use-revenues";
import type { Revenue } from "@/types/finance";

interface RevenueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenue: Revenue | null;
}

export function RevenueFormDialog({ open, onOpenChange, revenue }: RevenueFormDialogProps) {
  const createRevenue = useCreateRevenue();
  const updateRevenue = useUpdateRevenue();
  const isEditing = Boolean(revenue);
  const submitting = createRevenue.isPending || updateRevenue.isPending;

  function handleSubmit(values: RevenueFormValues) {
    const payload = revenueFormValuesToPayload(values);

    if (revenue) {
      updateRevenue.mutate({ id: revenue.id, payload }, { onSuccess: () => onOpenChange(false) });
      return;
    }

    createRevenue.mutate(payload, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar receita" : "Nova receita"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da receita selecionada."
              : "Preencha os dados para cadastrar uma nova receita."}
          </DialogDescription>
        </DialogHeader>
        <RevenueForm
          key={revenue?.id ?? "create"}
          revenue={revenue}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
