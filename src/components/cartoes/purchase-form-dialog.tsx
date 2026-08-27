import { useEffect, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useExpenseCategories } from "@/hooks/use-expenses";
import {
  useCardResponsibleSuggestions,
  useCreatePurchase,
  useUpdatePurchase,
} from "@/hooks/use-credit-cards";
import { useFamilyAccess, useFamilyMembers } from "@/hooks/use-family";
import { useCurrentUser } from "@/hooks/use-user-settings";
import { parseISODateToLocalDate, toISODateString } from "@/lib/finance-format";
import type { CreditCardPurchase } from "@/types/credit-card";

const purchaseFormSchema = z
  .object({
    description: z.string().min(2, "Informe uma descrição.").max(160),
    amount: z
      .number({ invalid_type_error: "Informe um valor." })
      .positive("Informe um valor maior que zero."),
    purchaseDate: z.date({ required_error: "Selecione a data da compra." }),
    categoryId: z.string().optional(),
    responsibleName: z.string().max(80, "Máximo de 80 caracteres.").optional(),
    notes: z.string().max(500).optional(),
    isInstallment: z.boolean(),
    totalInstallments: z.number().int().min(2).max(48).optional(),
  })
  .refine((values) => !values.isInstallment || Boolean(values.totalInstallments), {
    message: "Informe a quantidade de parcelas.",
    path: ["totalInstallments"],
  });

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

function toFormDefaults(purchase: CreditCardPurchase | null): PurchaseFormValues {
  if (!purchase) {
    return {
      description: "",
      amount: undefined as unknown as number,
      purchaseDate: new Date(),
      categoryId: undefined,
      responsibleName: "",
      notes: "",
      isInstallment: false,
      totalInstallments: undefined,
    };
  }
  return {
    description: purchase.description,
    amount: purchase.amount,
    purchaseDate: parseISODateToLocalDate(purchase.purchaseDate),
    categoryId: purchase.categoryId ?? undefined,
    responsibleName: purchase.responsibleName ?? "",
    notes: purchase.notes ?? "",
    isInstallment: false,
    totalInstallments: undefined,
  };
}

interface PurchaseFormDialogProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: CreditCardPurchase | null;
}

export function PurchaseFormDialog({
  cardId,
  open,
  onOpenChange,
  purchase,
}: PurchaseFormDialogProps) {
  const categoriesQuery = useExpenseCategories();
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const responsibleSuggestions = useCardResponsibleSuggestions(cardId);
  const currentUser = useCurrentUser();
  const familyMembers = useFamilyMembers();
  const familyAccess = useFamilyAccess();
  const isEditing = Boolean(purchase);
  const isReadOnly = purchase?.source === "OPEN_FINANCE";
  const submitting = createPurchase.isPending || updatePurchase.isPending;

  const responsibleListId = `responsible-options-${cardId}`;
  const responsibleOptions = useMemo(() => {
    const names = new Set<string>();
    if (currentUser.data?.name) names.add(currentUser.data.name);
    for (const grant of familyMembers.data ?? []) {
      if (grant.member?.name) names.add(grant.member.name);
    }
    for (const grant of familyAccess.data ?? []) {
      if (grant.owner?.name) names.add(grant.owner.name);
    }
    for (const name of responsibleSuggestions.data ?? []) names.add(name);
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [currentUser.data, familyMembers.data, familyAccess.data, responsibleSuggestions.data]);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: toFormDefaults(purchase),
  });
  const isInstallment = form.watch("isInstallment");

  useEffect(() => {
    if (open) {
      form.reset(toFormDefaults(purchase));
    }
  }, [open, purchase, form]);

  function handleSubmit(values: PurchaseFormValues) {
    const notes = values.notes ? { notes: values.notes } : {};
    const trimmedResponsible = values.responsibleName?.trim() ?? "";

    if (purchase) {
      updatePurchase.mutate(
        {
          id: purchase.id,
          input: isReadOnly
            ? {
                categoryId: values.categoryId ?? null,
                responsibleName: trimmedResponsible || null,
                ...notes,
              }
            : {
                description: values.description,
                purchaseDate: toISODateString(values.purchaseDate),
                categoryId: values.categoryId ?? null,
                responsibleName: trimmedResponsible || null,
                ...notes,
              },
        },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }

    createPurchase.mutate(
      {
        cardId,
        input: {
          description: values.description,
          amount: values.amount,
          purchaseDate: toISODateString(values.purchaseDate),
          ...(values.categoryId ? { categoryId: values.categoryId } : {}),
          ...(trimmedResponsible ? { responsibleName: trimmedResponsible } : {}),
          ...notes,
          ...(values.isInstallment && values.totalInstallments
            ? { totalInstallments: values.totalInstallments }
            : {}),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar compra" : "Nova compra"}</DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "Compra importada via Open Finance — apenas categoria e observação podem ser alteradas."
              : isEditing
                ? "Atualize os dados da compra."
                : "Lance uma compra à vista ou parcelada neste cartão."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Supermercado, Netflix..."
                      disabled={isReadOnly}
                      {...field}
                    />
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
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da compra</FormLabel>
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

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
              name="responsibleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável pela compra</FormLabel>
                  <FormControl>
                    <Input
                      list={responsibleListId}
                      placeholder="Quem fez a compra? (opcional)"
                      autoComplete="off"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <datalist id={responsibleListId}>
                    {responsibleOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="isInstallment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-input p-3">
                      <FormLabel className="cursor-pointer">Compra parcelada</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                            onChange={(event) =>
                              field.onChange(Number(event.target.value) || undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
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
                ) : (
                  "Salvar compra"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
