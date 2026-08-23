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
import { INVESTMENT_INCOME_TYPE_OPTIONS } from "@/components/investimentos/investment-type-meta";
import { useCreateIncome } from "@/hooks/use-investments";
import { toISODateString } from "@/lib/finance-format";
import type { Investment, InvestmentIncomeType } from "@/types/investment";

const formSchema = z.object({
  type: z.custom<InvestmentIncomeType>((value) => typeof value === "string" && value.length > 0, {
    message: "Selecione o tipo de rendimento.",
  }),
  amount: z
    .number({ invalid_type_error: "Informe um valor." })
    .positive("Informe um valor maior que zero."),
  paymentDate: z.date({ required_error: "Selecione a data." }),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface IncomeDialogProps {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncomeDialog({ investment, open, onOpenChange }: IncomeDialogProps) {
  const createIncome = useCreateIncome();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "DIVIDENDO",
      amount: undefined as unknown as number,
      paymentDate: new Date(),
      notes: "",
    },
  });

  function handleSubmit(values: FormValues) {
    if (!investment) return;
    createIncome.mutate(
      {
        investmentId: investment.id,
        input: {
          type: values.type,
          amount: values.amount,
          paymentDate: toISODateString(values.paymentDate),
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
          <DialogTitle>Registrar rendimento</DialogTitle>
          <DialogDescription>
            {investment?.name
              ? `Registre um dividendo, juros ou outro rendimento de ${investment.name}.`
              : "Registre um dividendo, juros ou outro rendimento deste investimento."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVESTMENT_INCOME_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do pagamento</FormLabel>
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
                disabled={createIncome.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createIncome.isPending}
                className="bg-gradient-brand font-semibold"
              >
                {createIncome.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  "Registrar rendimento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
