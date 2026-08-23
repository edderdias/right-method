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
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGoalTransaction } from "@/hooks/use-financial-goals";
import { useAccounts } from "@/hooks/use-revenues";
import { formatBRL, toISODateString } from "@/lib/finance-format";
import type { FinancialGoal } from "@/types/financial-goal";

function buildFormSchema(availableAmount: number) {
  return z.object({
    amount: z
      .number({ invalid_type_error: "Informe um valor." })
      .positive("Informe um valor maior que zero.")
      .max(availableAmount, `Saldo disponível na meta: ${formatBRL(availableAmount)}.`),
    transactionDate: z.date({ required_error: "Selecione a data." }),
    sourceAccountId: z.string(),
    description: z.string().max(300).optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

interface WithdrawalDialogProps {
  goal: FinancialGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawalDialog({ goal, open, onOpenChange }: WithdrawalDialogProps) {
  const createTransaction = useCreateGoalTransaction();
  const accountsQuery = useAccounts();
  const availableAmount = goal?.currentAmount ?? 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(buildFormSchema(availableAmount)),
    defaultValues: {
      amount: undefined as unknown as number,
      transactionDate: new Date(),
      sourceAccountId: "",
      description: "",
    },
  });

  function handleSubmit(values: FormValues) {
    if (!goal) return;
    createTransaction.mutate(
      {
        goalId: goal.id,
        input: {
          type: "WITHDRAW",
          amount: values.amount,
          transactionDate: toISODateString(values.transactionDate),
          ...(values.sourceAccountId ? { sourceAccountId: values.sourceAccountId } : {}),
          ...(values.description ? { description: values.description } : {}),
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
          <DialogTitle>Retirar dinheiro</DialogTitle>
          <DialogDescription>
            {goal?.name
              ? `Retire um valor da meta "${goal.name}". Saldo disponível: ${formatBRL(availableAmount)}.`
              : "Retire um valor desta meta."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
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

            <FormField
              control={form.control}
              name="sourceAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino (opcional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(accountsQuery.data ?? []).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Emergência" rows={2} {...field} />
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
                  "Retirar dinheiro"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
