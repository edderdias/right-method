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
import { toISODateString } from "@/lib/finance-format";
import type { FinancialGoal } from "@/types/financial-goal";

const formSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Informe um valor." })
    .positive("Informe um valor maior que zero."),
  transactionDate: z.date({ required_error: "Selecione a data." }),
  sourceAccountId: z.string(),
  description: z.string().max(300).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContributionDialogProps {
  goal: FinancialGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContributionDialog({ goal, open, onOpenChange }: ContributionDialogProps) {
  const createTransaction = useCreateGoalTransaction();
  const accountsQuery = useAccounts();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
          type: "DEPOSIT",
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
          <DialogTitle>Adicionar dinheiro</DialogTitle>
          <DialogDescription>
            {goal?.name
              ? `Registre um aporte na meta "${goal.name}". O valor não é contabilizado como uma nova receita — é apenas um destaque sobre dinheiro que você já tem.`
              : "Registre um aporte nesta meta."}
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
                  <FormLabel>Origem (opcional)</FormLabel>
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
                  <FormLabel>Observação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Aporte mensal" rows={2} {...field} />
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
                  "Adicionar dinheiro"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
