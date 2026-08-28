import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2 } from "lucide-react";

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
import { useAccounts, useTransferBetweenAccounts } from "@/hooks/use-revenues";
import { formatBRL, toISODateString } from "@/lib/finance-format";

const formSchema = z
  .object({
    fromAccountId: z.string().min(1, "Selecione a conta de origem."),
    toAccountId: z.string().min(1, "Selecione a conta de destino."),
    amount: z
      .number({ invalid_type_error: "Informe um valor." })
      .positive("Informe um valor maior que zero."),
    transferDate: z.date({ required_error: "Selecione a data." }),
    description: z.string().max(160).optional(),
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    message: "Escolha contas diferentes.",
    path: ["toAccountId"],
  });

type FormValues = z.infer<typeof formSchema>;

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDialog({ open, onOpenChange }: TransferDialogProps) {
  const accountsQuery = useAccounts();
  const transfer = useTransferBetweenAccounts();
  const accounts = accountsQuery.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: undefined as unknown as number,
      transferDate: new Date(),
      description: "",
    },
  });

  const fromAccountId = form.watch("fromAccountId");
  const amount = form.watch("amount");
  const fromAccount = accounts.find((account) => account.id === fromAccountId);
  const insufficient =
    fromAccount !== undefined && typeof amount === "number" && amount > fromAccount.balance;

  function handleSubmit(values: FormValues) {
    transfer.mutate(
      {
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        amount: values.amount,
        transferDate: toISODateString(values.transferDate),
        ...(values.description ? { description: values.description } : {}),
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferir entre contas</DialogTitle>
          <DialogDescription>
            O valor é debitado da conta de origem e creditado na conta de destino. A transferência
            não conta como receita nem despesa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fromAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>De</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} · {formatBRL(account.balance)}
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
                name="toAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} · {formatBRL(account.balance)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                name="transferDate"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: reserva de emergência" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {insufficient && (
              <p className="flex items-center gap-2 rounded-lg bg-warning/12 p-3 text-xs text-foreground">
                <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                O valor é maior que o saldo de {fromAccount?.name} ({formatBRL(fromAccount?.balance ?? 0)}).
                A conta ficará com saldo negativo.
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={transfer.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={transfer.isPending}
                className="bg-gradient-brand font-semibold"
              >
                {transfer.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Transferindo...
                  </>
                ) : (
                  "Transferir"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
