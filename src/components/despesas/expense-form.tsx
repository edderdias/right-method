import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts, useCreateAccount } from "@/hooks/use-revenues";
import { useExpenseCategories } from "@/hooks/use-expenses";
import { parseISODateToLocalDate, toISODateString } from "@/lib/finance-format";
import type { CreateExpenseInput, Expense, RecurrenceType } from "@/types/finance";

const recurrenceTypeOptions: { value: RecurrenceType; label: string }[] = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quinzenal" },
  { value: "YEARLY", label: "Anual" },
  { value: "CUSTOM", label: "Personalizado" },
];

const expenseFormSchema = z
  .object({
    description: z.string().min(2, "Informe uma descrição.").max(160),
    amount: z
      .number({ invalid_type_error: "Informe um valor." })
      .positive("Informe um valor maior que zero."),
    categoryId: z.string().min(1, "Selecione uma categoria."),
    accountId: z.string().min(1, "Selecione uma conta."),
    dueDate: z.date({ required_error: "Selecione a data de vencimento." }),
    status: z.enum(["PENDING", "PAID"]),
    notes: z.string().max(500).optional(),
    isRecurring: z.boolean(),
    recurrenceType: z.custom<RecurrenceType>().optional(),
    recurrenceEndDate: z.date().optional(),
    isInstallment: z.boolean(),
    totalInstallments: z.number().int().min(2).max(48).optional(),
  })
  .refine((values) => !values.isRecurring || Boolean(values.recurrenceType), {
    message: "Selecione a recorrência.",
    path: ["recurrenceType"],
  })
  .refine((values) => !values.isInstallment || Boolean(values.totalInstallments), {
    message: "Informe a quantidade de parcelas.",
    path: ["totalInstallments"],
  })
  .refine((values) => !(values.isRecurring && values.isInstallment), {
    message: "Uma despesa não pode ser recorrente e parcelada ao mesmo tempo.",
    path: ["isInstallment"],
  });

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

function toFormDefaults(expense: Expense | null): ExpenseFormValues {
  if (!expense) {
    return {
      description: "",
      amount: undefined as unknown as number,
      categoryId: "",
      accountId: "",
      dueDate: new Date(),
      status: "PENDING",
      notes: "",
      isRecurring: false,
      recurrenceType: undefined,
      recurrenceEndDate: undefined,
      isInstallment: false,
      totalInstallments: undefined,
    };
  }

  return {
    description: expense.description,
    amount: expense.amount,
    categoryId: expense.categoryId,
    accountId: expense.accountId,
    dueDate: parseISODateToLocalDate(expense.dueDate),
    status: expense.status === "PAID" ? "PAID" : "PENDING",
    notes: expense.notes ?? "",
    isRecurring: expense.isRecurring,
    recurrenceType: expense.recurrenceType ?? undefined,
    recurrenceEndDate: expense.recurrenceEndDate
      ? parseISODateToLocalDate(expense.recurrenceEndDate)
      : undefined,
    isInstallment: expense.isInstallment,
    totalInstallments: expense.installmentTotal ?? undefined,
  };
}

export function expenseFormValuesToPayload(values: ExpenseFormValues): CreateExpenseInput {
  return {
    description: values.description,
    amount: values.amount,
    categoryId: values.categoryId,
    accountId: values.accountId,
    dueDate: toISODateString(values.dueDate),
    status: values.status,
    isRecurring: values.isRecurring,
    isInstallment: values.isInstallment,
    ...(values.notes ? { notes: values.notes } : {}),
    ...(values.isRecurring && values.recurrenceType
      ? { recurrenceType: values.recurrenceType }
      : {}),
    ...(values.isRecurring && values.recurrenceEndDate
      ? { recurrenceEndDate: toISODateString(values.recurrenceEndDate) }
      : {}),
    ...(values.isInstallment && values.totalInstallments
      ? { totalInstallments: values.totalInstallments }
      : {}),
  };
}

interface ExpenseFormProps {
  expense: Expense | null;
  submitting: boolean;
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
}

function InlineCreateAccount({ onCreated }: { onCreated: (accountId: string) => void }) {
  const [name, setName] = useState("");
  const createAccount = useCreateAccount();

  function handleCreate() {
    if (!name.trim()) return;
    createAccount.mutate(
      { name: name.trim() },
      {
        onSuccess: (account) => {
          setName("");
          onCreated(account.id);
        },
      },
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-input p-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nome da conta (ex: Conta corrente)"
        className="h-8"
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={createAccount.isPending || !name.trim()}
        onClick={handleCreate}
      >
        {createAccount.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        Criar conta
      </Button>
    </div>
  );
}

export function ExpenseForm({ expense, submitting, onSubmit, onCancel }: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: toFormDefaults(expense),
  });

  const categoriesQuery = useExpenseCategories();
  const accountsQuery = useAccounts();
  const isRecurring = form.watch("isRecurring");
  const isInstallment = form.watch("isInstallment");
  const accounts = accountsQuery.data ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Aluguel, Mercado, Internet..." {...field} />
              </FormControl>
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
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de vencimento</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="categoryId"
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
                    {(categoriesQuery.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isInstallment}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="PAID">Paga</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conta</FormLabel>
              {accounts.length > 0 ? (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Você ainda não possui contas cadastradas.
                </p>
              )}
              <InlineCreateAccount onCreated={(accountId) => field.onChange(accountId)} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-input p-3">
              <FormLabel className="cursor-pointer">Despesa recorrente</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isInstallment}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isRecurring && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="recurrenceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recorrência</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recurrenceTypeOptions.map((option) => (
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
              name="recurrenceEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data final (opcional)</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Sem data de término"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="isInstallment"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-input p-3">
              <FormLabel className="cursor-pointer">Despesa parcelada</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) form.setValue("status", "PENDING");
                  }}
                  disabled={isRecurring || Boolean(expense)}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isInstallment && (
          <FormField
            control={form.control}
            name="totalInstallments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade de parcelas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2}
                    max={48}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(Number(event.target.value) || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="bg-gradient-brand font-semibold">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Salvando...
              </>
            ) : (
              "Salvar despesa"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
