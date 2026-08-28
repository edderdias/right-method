import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

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
import { useUpdateCreditCard } from "@/hooks/use-credit-cards";
import type { CreditCard } from "@/types/credit-card";

const BRAND_OPTIONS = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outra"];

const formSchema = z.object({
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

type FormValues = z.infer<typeof formSchema>;

interface EditCreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCard | null;
}

export function EditCreditCardDialog({ open, onOpenChange, card }: EditCreditCardDialogProps) {
  const updateCard = useUpdateCreditCard();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", brand: undefined, lastFourDigits: "" },
  });

  useEffect(() => {
    if (open && card) {
      form.reset({
        name: card.name,
        brand: card.brand ?? undefined,
        lastFourDigits: card.lastFourDigits ?? "",
        creditLimit: card.creditLimit ?? undefined,
        closingDay: card.closingDay ?? undefined,
        dueDay: card.dueDay ?? undefined,
      });
    }
  }, [open, card, form]);

  function handleSubmit(values: FormValues) {
    if (!card) return;
    updateCard.mutate(
      {
        id: card.id,
        input: {
          name: values.name,
          ...(values.brand ? { brand: values.brand } : {}),
          ...(values.lastFourDigits ? { lastFourDigits: values.lastFourDigits } : {}),
          ...(values.creditLimit !== undefined ? { creditLimit: values.creditLimit } : {}),
          ...(values.closingDay !== undefined ? { closingDay: values.closingDay } : {}),
          ...(values.dueDay !== undefined ? { dueDay: values.dueDay } : {}),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cartão</DialogTitle>
          <DialogDescription>
            Ajuste o limite total de crédito, a data de fechamento e a data de vencimento da fatura.
          </DialogDescription>
        </DialogHeader>

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
                  <FormLabel>Limite total de crédito</FormLabel>
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
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateCard.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateCard.isPending}
                className="bg-gradient-brand font-semibold"
              >
                {updateCard.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
