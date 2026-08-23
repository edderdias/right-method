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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GOAL_CATEGORY_OPTIONS,
  GOAL_PRIORITY_OPTIONS,
} from "@/components/metas/financial-goal-category-meta";
import { useCreateFinancialGoal, useUpdateFinancialGoal } from "@/hooks/use-financial-goals";
import { useAccounts } from "@/hooks/use-revenues";
import { useExpensesEvolution } from "@/hooks/use-expenses";
import { formatBRL, parseISODateToLocalDate, toISODateString } from "@/lib/finance-format";
import type { FinancialGoal, FinancialGoalCategory, GoalPriority } from "@/types/financial-goal";

const formSchema = z.object({
  name: z.string().min(2, "Informe o nome da meta.").max(160),
  description: z.string().max(500).optional(),
  category: z.custom<FinancialGoalCategory>(
    (value) => typeof value === "string" && value.length > 0,
    {
      message: "Selecione a categoria.",
    },
  ),
  priority: z.custom<GoalPriority>((value) => typeof value === "string" && value.length > 0, {
    message: "Selecione a prioridade.",
  }),
  targetAmount: z
    .number({ invalid_type_error: "Informe o valor objetivo." })
    .positive("Informe um valor maior que zero."),
  initialAmount: z.number().min(0).optional(),
  startDate: z.date({ required_error: "Selecione a data inicial." }),
  targetDate: z.date({ required_error: "Selecione o prazo." }),
  linkedAccountId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

function toFormDefaults(goal: FinancialGoal | null): FormValues {
  if (!goal) {
    return {
      name: "",
      description: "",
      category: "RESERVA_EMERGENCIA",
      priority: "MEDIUM",
      targetAmount: undefined as unknown as number,
      initialAmount: undefined,
      startDate: new Date(),
      targetDate: undefined as unknown as Date,
      linkedAccountId: "",
    };
  }
  return {
    name: goal.name,
    description: goal.description ?? "",
    category: goal.category,
    priority: goal.priority,
    targetAmount: goal.targetAmount,
    initialAmount: goal.initialAmount || undefined,
    startDate: parseISODateToLocalDate(goal.startDate),
    targetDate: parseISODateToLocalDate(goal.targetDate),
    linkedAccountId: goal.linkedAccountId ?? "",
  };
}

interface FinancialGoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: FinancialGoal | null;
}

export function FinancialGoalFormDialog({
  open,
  onOpenChange,
  goal,
}: FinancialGoalFormDialogProps) {
  const createGoal = useCreateFinancialGoal();
  const updateGoal = useUpdateFinancialGoal();
  const accountsQuery = useAccounts();
  const expensesEvolutionQuery = useExpensesEvolution(6);
  const isEditing = Boolean(goal);
  const submitting = createGoal.isPending || updateGoal.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: toFormDefaults(goal),
  });
  const category = form.watch("category");

  const expensesPoints = expensesEvolutionQuery.data ?? [];
  const avgMonthlyExpenses =
    expensesPoints.length > 0
      ? expensesPoints.reduce((sum, point) => sum + point.total, 0) / expensesPoints.length
      : 0;
  const suggestedReserve = avgMonthlyExpenses * 6;

  function handleSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      ...(values.description ? { description: values.description } : {}),
      category: values.category,
      priority: values.priority,
      targetAmount: values.targetAmount,
      ...(values.initialAmount !== undefined ? { initialAmount: values.initialAmount } : {}),
      startDate: toISODateString(values.startDate),
      targetDate: toISODateString(values.targetDate),
      ...(values.linkedAccountId ? { linkedAccountId: values.linkedAccountId } : {}),
    };

    if (goal) {
      updateGoal.mutate({ id: goal.id, input: payload }, { onSuccess: () => onOpenChange(false) });
      return;
    }

    createGoal.mutate(payload, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar meta" : "Criar nova meta"}</DialogTitle>
          <DialogDescription>
            Defina o objetivo, o prazo e a prioridade. Depois de criada, você pode registrar aportes
            e retiradas e acompanhar o progresso.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da meta</FormLabel>
                  <FormControl>
                    <Input placeholder="Reserva de emergência" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Do que se trata essa meta?" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GOAL_CATEGORY_OPTIONS.map((option) => (
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
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GOAL_PRIORITY_OPTIONS.map((option) => (
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
            </div>

            {category === "RESERVA_EMERGENCIA" && suggestedReserve > 0 && (
              <p className="rounded-2xl bg-primary/12 p-3 text-xs text-foreground">
                Com base na sua despesa média dos últimos meses ({formatBRL(avgMonthlyExpenses)}),
                uma reserva de 6 meses ficaria em torno de{" "}
                <strong>{formatBRL(suggestedReserve)}</strong>. É só uma sugestão.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor objetivo</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor inicial (opcional)</FormLabel>
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data inicial</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo (data limite)</FormLabel>
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
              name="linkedAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta vinculada (opcional)</FormLabel>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-brand font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  "Salvar alterações"
                ) : (
                  "Criar meta"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
