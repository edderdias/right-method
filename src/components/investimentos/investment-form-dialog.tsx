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
  INVESTMENT_TYPE_OPTIONS,
  isFixedIncomeType,
} from "@/components/investimentos/investment-type-meta";
import { useCreateInvestment, useUpdateInvestment } from "@/hooks/use-investments";
import { parseISODateToLocalDate, toISODateString } from "@/lib/finance-format";
import type { Investment, InvestmentType } from "@/types/investment";

const formSchema = z.object({
  type: z.custom<InvestmentType>((value) => typeof value === "string" && value.length > 0, {
    message: "Selecione o tipo de investimento.",
  }),
  ticker: z.string().max(20).optional(),
  name: z.string().min(2, "Informe o nome do ativo.").max(160),
  institutionName: z.string().max(80).optional(),
  quantity: z.number().min(0).optional(),
  averagePrice: z.number().positive().optional(),
  investedAmount: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  currentPrice: z.number().positive().optional(),
  issuer: z.string().max(80).optional(),
  rate: z.string().max(40).optional(),
  indexer: z.string().max(40).optional(),
  maturityDate: z.date().optional(),
  liquidity: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function toFormDefaults(investment: Investment | null): FormValues {
  if (!investment) {
    return {
      type: "RENDA_FIXA",
      ticker: "",
      name: "",
      institutionName: "",
      quantity: undefined,
      averagePrice: undefined,
      investedAmount: undefined,
      currentValue: undefined,
      currentPrice: undefined,
      issuer: "",
      rate: "",
      indexer: "",
      maturityDate: undefined,
      liquidity: "",
      notes: "",
    };
  }
  return {
    type: investment.type,
    ticker: investment.ticker ?? "",
    name: investment.name,
    institutionName: investment.institutionName ?? "",
    quantity: investment.quantity || undefined,
    averagePrice: investment.averagePrice ?? undefined,
    investedAmount: investment.investedAmount || undefined,
    currentValue: investment.currentValue || undefined,
    currentPrice: investment.currentPrice ?? undefined,
    issuer: investment.issuer ?? "",
    rate: investment.rate ?? "",
    indexer: investment.indexer ?? "",
    maturityDate: investment.maturityDate
      ? parseISODateToLocalDate(investment.maturityDate)
      : undefined,
    liquidity: investment.liquidity ?? "",
    notes: investment.notes ?? "",
  };
}

interface InvestmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
}

export function InvestmentFormDialog({
  open,
  onOpenChange,
  investment,
}: InvestmentFormDialogProps) {
  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment();
  const isEditing = Boolean(investment);
  const isReadOnly = investment?.source === "OPEN_FINANCE";
  const submitting = createInvestment.isPending || updateInvestment.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: toFormDefaults(investment),
  });
  const type = form.watch("type");

  function handleSubmit(values: FormValues) {
    const payload = {
      type: values.type,
      name: values.name,
      ...(values.ticker ? { ticker: values.ticker } : {}),
      ...(values.institutionName ? { institutionName: values.institutionName } : {}),
      ...(values.quantity !== undefined ? { quantity: values.quantity } : {}),
      ...(values.averagePrice !== undefined ? { averagePrice: values.averagePrice } : {}),
      ...(values.investedAmount !== undefined ? { investedAmount: values.investedAmount } : {}),
      ...(values.currentValue !== undefined ? { currentValue: values.currentValue } : {}),
      ...(values.currentPrice !== undefined ? { currentPrice: values.currentPrice } : {}),
      ...(isFixedIncomeType(values.type)
        ? {
            ...(values.issuer ? { issuer: values.issuer } : {}),
            ...(values.rate ? { rate: values.rate } : {}),
            ...(values.indexer ? { indexer: values.indexer } : {}),
            ...(values.maturityDate ? { maturityDate: toISODateString(values.maturityDate) } : {}),
            ...(values.liquidity ? { liquidity: values.liquidity } : {}),
          }
        : {}),
      ...(values.notes ? { notes: values.notes } : {}),
    };

    if (investment) {
      updateInvestment.mutate(
        { id: investment.id, input: payload },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }

    createInvestment.mutate(payload, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar investimento" : "Novo investimento"}</DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "Investimento conectado via Open Finance — os dados são preservados conforme enviados pela instituição."
              : "Cadastre um ativo da sua carteira. Você poderá registrar aportes, resgates e rendimentos depois."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de investimento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVESTMENT_TYPE_OPTIONS.map((option) => (
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CDB Banco X, XP Malls..."
                        disabled={isReadOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticker (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="XPML11" disabled={isReadOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="institutionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instituição</FormLabel>
                  <FormControl>
                    <Input placeholder="XP, Banco Inter, BTG..." disabled={isReadOnly} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        disabled={isReadOnly}
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
                name="averagePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço médio (opcional)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="investedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor aplicado</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor atual (opcional)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isFixedIncomeType(type) && (
              <div className="space-y-4 rounded-2xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-muted-foreground">Dados de renda fixa</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="issuer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emissor</FormLabel>
                        <FormControl>
                          <Input placeholder="Banco X" disabled={isReadOnly} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa</FormLabel>
                        <FormControl>
                          <Input placeholder="110% CDI" disabled={isReadOnly} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="indexer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indexador</FormLabel>
                        <FormControl>
                          <Input placeholder="CDI" disabled={isReadOnly} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="liquidity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liquidez</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Diária, no vencimento..."
                            disabled={isReadOnly}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="maturityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimento</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isReadOnly}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Opcional" rows={3} disabled={isReadOnly} {...field} />
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
                disabled={submitting}
              >
                Cancelar
              </Button>
              {!isReadOnly && (
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
                    "Cadastrar investimento"
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
