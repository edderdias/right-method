import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Loader2, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useConnections } from "@/hooks/use-open-finance";
import {
  useAddOpenFinanceCard,
  useAvailableOpenFinanceCards,
  useCreateCreditCard,
} from "@/hooks/use-credit-cards";

const BRAND_OPTIONS = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outra"];

const manualFormSchema = z.object({
  name: z.string().min(2, "Informe o nome do cartão.").max(80),
  brand: z.string().optional(),
  lastFourDigits: z
    .string()
    .regex(/^\d{4}$/, "Informe os últimos 4 dígitos.")
    .optional()
    .or(z.literal("")),
  creditLimit: z.number().positive("Informe um valor maior que zero.").optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
});

type ManualFormValues = z.infer<typeof manualFormSchema>;

type Mode = "choice" | "manual" | "of-connections" | "of-cards";

interface NewCreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ManualCardForm({ onDone }: { onDone: () => void }) {
  const createCard = useCreateCreditCard();
  const form = useForm<ManualFormValues>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: { name: "", brand: undefined, lastFourDigits: "" },
  });

  function handleSubmit(values: ManualFormValues) {
    createCard.mutate(
      {
        name: values.name,
        ...(values.brand ? { brand: values.brand } : {}),
        ...(values.lastFourDigits ? { lastFourDigits: values.lastFourDigits } : {}),
        ...(values.creditLimit ? { creditLimit: values.creditLimit } : {}),
        ...(values.closingDay ? { closingDay: values.closingDay } : {}),
        ...(values.dueDay ? { dueDay: values.dueDay } : {}),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do cartão</FormLabel>
              <FormControl>
                <Input placeholder="Nubank, Inter, C6..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bandeira</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BRAND_OPTIONS.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
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
            name="lastFourDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Últimos 4 dígitos</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" maxLength={4} placeholder="1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="creditLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite</FormLabel>
              <FormControl>
                <MoneyInput value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="closingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia de fechamento</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(Number(event.target.value) || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia de vencimento</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(Number(event.target.value) || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={createCard.isPending}
            className="bg-gradient-brand font-semibold"
          >
            {createCard.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Salvando...
              </>
            ) : (
              "Cadastrar cartão"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function OpenFinanceCardsList({
  connectionId,
  onDone,
}: {
  connectionId: string;
  onDone: () => void;
}) {
  const cardsQuery = useAvailableOpenFinanceCards(connectionId);
  const addCard = useAddOpenFinanceCard();
  const cards = cardsQuery.data ?? [];

  if (cardsQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum cartão de crédito novo encontrado nessa conexão.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{card.marketingName ?? card.name}</p>
            <p className="text-xs text-muted-foreground">•••• {card.number.slice(-4)}</p>
          </div>
          <Button
            size="sm"
            disabled={addCard.isPending}
            onClick={() =>
              addCard.mutate({ connectionId, externalCardId: card.id }, { onSuccess: onDone })
            }
          >
            Adicionar
          </Button>
        </div>
      ))}
    </div>
  );
}

export function NewCreditCardDialog({ open, onOpenChange }: NewCreditCardDialogProps) {
  const [mode, setMode] = useState<Mode>("choice");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const connectionsQuery = useConnections();
  const connections = (connectionsQuery.data ?? []).filter((c) => c.status === "CONNECTED");

  function reset(nextOpen: boolean) {
    if (!nextOpen) {
      setMode("choice");
      setSelectedConnectionId(null);
    }
    onOpenChange(nextOpen);
  }

  const effectiveMode: Mode = mode === "choice" && connections.length === 0 ? "manual" : mode;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          {effectiveMode !== "choice" && effectiveMode !== "manual" && connections.length > 0 && (
            <button
              type="button"
              onClick={() => setMode(effectiveMode === "of-cards" ? "of-connections" : "choice")}
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Voltar
            </button>
          )}
          <DialogTitle>Novo cartão</DialogTitle>
          <DialogDescription>
            {effectiveMode === "choice" && "Escolha como deseja adicionar o cartão."}
            {effectiveMode === "manual" &&
              "Preencha os dados do seu cartão. Nunca pedimos número completo, CVV ou senha."}
            {effectiveMode === "of-connections" && "Selecione a instituição conectada."}
            {effectiveMode === "of-cards" && "Cartões encontrados nessa conexão."}
          </DialogDescription>
        </DialogHeader>

        {effectiveMode === "choice" && (
          <div className="space-y-2">
            <Button
              className="w-full justify-start rounded-xl bg-gradient-brand font-semibold"
              onClick={() => setMode("of-connections")}
            >
              <Wifi className="size-4" aria-hidden="true" />
              Usar cartão do Open Finance
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl"
              onClick={() => setMode("manual")}
            >
              Cadastrar manualmente
            </Button>
          </div>
        )}

        {effectiveMode === "of-connections" && (
          <div className="space-y-2">
            {connections.map((connection) => (
              <button
                key={connection.id}
                type="button"
                onClick={() => {
                  setSelectedConnectionId(connection.id);
                  setMode("of-cards");
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-border/70 p-3 text-left text-sm hover:bg-surface-2"
              >
                <span className="font-medium">{connection.institutionName}</span>
                <span className="text-xs text-muted-foreground">Ver cartões</span>
              </button>
            ))}
          </div>
        )}

        {effectiveMode === "of-cards" && selectedConnectionId && (
          <OpenFinanceCardsList connectionId={selectedConnectionId} onDone={() => reset(false)} />
        )}

        {effectiveMode === "manual" && <ManualCardForm onDone={() => reset(false)} />}
      </DialogContent>
    </Dialog>
  );
}
