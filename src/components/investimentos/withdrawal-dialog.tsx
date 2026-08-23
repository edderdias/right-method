import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTransaction } from "@/hooks/use-investments";
import { formatBRL, toISODateString } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { Investment } from "@/types/investment";

const formSchema = z.object({
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  amount: z
    .number({ invalid_type_error: "Informe um valor." })
    .positive("Informe um valor maior que zero."),
  fees: z.number().min(0).optional(),
  transactionDate: z.date({ required_error: "Selecione a data." }),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

/** Client-side estimate mirroring the backend's cost-basis proration (see
 * computeProportionalCostBasis in investment-transactions.service.ts): quantity-tracked positions
 * prorate by units sold, positions without a tracked quantity (renda fixa, poupança) prorate by
 * value. The API response after submit is the authoritative figure — this is only a preview. */
function estimateRealizedGain(
  investment: Investment,
  quantity: number | undefined,
  amount: number,
): number {
  const currentQuantity = investment.quantity;
  if (currentQuantity > 0) {
    const soldQuantity = quantity ?? currentQuantity;
    const costBasis = investment.investedAmount * (soldQuantity / currentQuantity);
    return amount - costBasis;
  }
  const costBasis =
    investment.currentValue > 0
      ? investment.investedAmount * (amount / investment.currentValue)
      : 0;
  return amount - costBasis;
}

interface WithdrawalDialogProps {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawalDialog({ investment, open, onOpenChange }: WithdrawalDialogProps) {
  const createTransaction = useCreateTransaction();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: undefined,
      unitPrice: undefined,
      amount: undefined as unknown as number,
      fees: undefined,
      transactionDate: new Date(),
      notes: "",
    },
  });
  const quantity = form.watch("quantity");
  const amount = form.watch("amount");

  const preview =
    investment && amount > 0 ? estimateRealizedGain(investment, quantity, amount) : null;

  function handleSubmit(values: FormValues) {
    if (!investment) return;
    createTransaction.mutate(
      {
        investmentId: investment.id,
        input: {
          type: values.quantity ? "SELL" : "WITHDRAW",
          amount: values.amount,
          transactionDate: toISODateString(values.transactionDate),
          ...(values.quantity !== undefined ? { quantity: values.quantity } : {}),
          ...(values.unitPrice !== undefined ? { unitPrice: values.unitPrice } : {}),
          ...(values.fees !== undefined ? { fees: values.fees } : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar resgate</DialogTitle>
          <DialogDescription>
            {investment?.name
              ? `Registre um resgate ou venda em ${investment.name}.`
              : "Registre um resgate ou venda deste investimento."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(Number(event.target.value) || undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (opcional)</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor total do resgate</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {preview !== null && (
              <div className="rounded-2xl bg-surface-2 p-4 text-sm">
                <p className="text-muted-foreground">Estimativa de ganho/perda realizado</p>
                <p
                  className={cn(
                    "mt-1 text-lg font-semibold",
                    preview >= 0 ? "text-primary" : "text-destructive",
                  )}
                >
                  {preview >= 0 ? "+" : ""}
                  {formatBRL(preview)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Valor final confirmado após o registro — resgates não são automaticamente lucro ou
                  prejuízo, apenas a diferença entre o valor resgatado e o custo proporcional.
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxas (opcional)</FormLabel>
                  <FormControl>
                    <MoneyInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Opcional" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createTransaction.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTransaction.isPending}
                className="bg-gradient-brand font-semibold"
              >
                {createTransaction.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  "Registrar resgate"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
