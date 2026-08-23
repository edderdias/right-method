import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  addOpenFinanceCreditCard,
  createCreditCard,
  createCreditCardPurchase,
  getCreditCard,
  getCreditCardInvoice,
  getCreditCardsSummary,
  listAvailableOpenFinanceCreditCards,
  listCreditCardInvoices,
  listCreditCardPurchases,
  listCreditCards,
  payCreditCardInvoice,
  removeCreditCard,
  removeCreditCardPurchase,
  syncOpenFinanceCreditCard,
  updateCreditCard,
  updateCreditCardPurchase,
} from "@/lib/credit-cards-api";
import type {
  CreatePurchaseInput,
  CreateCreditCardInput,
  CreditCardPurchaseFilters,
  PayInvoiceInput,
  RemovePurchaseScope,
  UpdateCreditCardInput,
  UpdatePurchaseInput,
} from "@/types/credit-card";

export const creditCardKeys = {
  all: ["credit-cards"] as const,
  summary: ["credit-cards", "summary"] as const,
  card: (id: string) => ["credit-cards", id] as const,
  purchases: (cardId: string, filters: CreditCardPurchaseFilters) =>
    ["credit-cards", cardId, "purchases", filters] as const,
  invoices: (cardId: string) => ["credit-cards", cardId, "invoices"] as const,
  invoice: (cardId: string, invoiceId: string) =>
    ["credit-cards", cardId, "invoices", invoiceId] as const,
  availableOpenFinance: (connectionId: string) =>
    ["credit-cards", "open-finance-available", connectionId] as const,
};

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useCreditCards() {
  return useQuery({ queryKey: creditCardKeys.all, queryFn: listCreditCards });
}

export function useCreditCardsSummary() {
  return useQuery({ queryKey: creditCardKeys.summary, queryFn: getCreditCardsSummary });
}

export function useCreditCard(id: string) {
  return useQuery({
    queryKey: creditCardKeys.card(id),
    queryFn: () => getCreditCard(id),
    enabled: Boolean(id),
  });
}

export function useCreditCardPurchases(cardId: string, filters: CreditCardPurchaseFilters) {
  return useQuery({
    queryKey: creditCardKeys.purchases(cardId, filters),
    queryFn: () => listCreditCardPurchases(cardId, filters),
    enabled: Boolean(cardId),
  });
}

export function useCreditCardInvoices(cardId: string) {
  return useQuery({
    queryKey: creditCardKeys.invoices(cardId),
    queryFn: () => listCreditCardInvoices(cardId),
    enabled: Boolean(cardId),
  });
}

export function useCreditCardInvoice(cardId: string, invoiceId: string) {
  return useQuery({
    queryKey: creditCardKeys.invoice(cardId, invoiceId),
    queryFn: () => getCreditCardInvoice(cardId, invoiceId),
    enabled: Boolean(cardId) && Boolean(invoiceId),
  });
}

export function useAvailableOpenFinanceCards(connectionId: string) {
  return useQuery({
    queryKey: creditCardKeys.availableOpenFinance(connectionId),
    queryFn: () => listAvailableOpenFinanceCreditCards(connectionId),
    enabled: Boolean(connectionId),
  });
}

function invalidateCardAndSummary(queryClient: ReturnType<typeof useQueryClient>, cardId?: string) {
  void queryClient.invalidateQueries({ queryKey: creditCardKeys.all });
  void queryClient.invalidateQueries({ queryKey: creditCardKeys.summary });
  if (cardId) {
    void queryClient.invalidateQueries({ queryKey: creditCardKeys.card(cardId) });
  }
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCreditCardInput) => createCreditCard(input),
    onSuccess: () => {
      toast.success("Cartão cadastrado com sucesso!");
      invalidateCardAndSummary(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCreditCardInput }) =>
      updateCreditCard(id, input),
    onSuccess: (card) => {
      toast.success("Cartão atualizado com sucesso!");
      invalidateCardAndSummary(queryClient, card.id);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useArchiveCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeCreditCard(id),
    onSuccess: (result) => {
      toast.success(result.message);
      invalidateCardAndSummary(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: CreatePurchaseInput }) =>
      createCreditCardPurchase(cardId, input),
    onSuccess: (purchase) => {
      toast.success("Compra cadastrada com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: ["credit-cards", purchase.cardId, "purchases"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["credit-cards", purchase.cardId, "invoices"],
      });
      invalidateCardAndSummary(queryClient, purchase.cardId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePurchaseInput }) =>
      updateCreditCardPurchase(id, input),
    onSuccess: (purchase) => {
      toast.success("Compra atualizada com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: ["credit-cards", purchase.cardId, "purchases"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["credit-cards", purchase.cardId, "invoices"],
      });
      invalidateCardAndSummary(queryClient, purchase.cardId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cardId,
      scope,
    }: {
      id: string;
      cardId: string;
      scope: RemovePurchaseScope;
    }) => removeCreditCardPurchase(id, scope),
    onSuccess: (_result, variables) => {
      toast.success("Compra excluída com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: ["credit-cards", variables.cardId, "purchases"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["credit-cards", variables.cardId, "invoices"],
      });
      invalidateCardAndSummary(queryClient, variables.cardId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      invoiceId,
      input,
    }: {
      cardId: string;
      invoiceId: string;
      input: PayInvoiceInput;
    }) => payCreditCardInvoice(cardId, invoiceId, input),
    onSuccess: (_invoice, variables) => {
      toast.success("Fatura paga com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: ["credit-cards", variables.cardId, "invoices"],
      });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      invalidateCardAndSummary(queryClient, variables.cardId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useAddOpenFinanceCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectionId,
      externalCardId,
    }: {
      connectionId: string;
      externalCardId: string;
    }) => addOpenFinanceCreditCard(connectionId, externalCardId),
    onSuccess: (card, variables) => {
      toast.success("Cartão adicionado ao Método Certo!");
      invalidateCardAndSummary(queryClient);
      void queryClient.invalidateQueries({
        queryKey: creditCardKeys.availableOpenFinance(variables.connectionId),
      });
      void queryClient.invalidateQueries({ queryKey: creditCardKeys.card(card.id) });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useSyncCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => syncOpenFinanceCreditCard(id),
    onSuccess: (result, id) => {
      toast.success(result.message);
      invalidateCardAndSummary(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: ["credit-cards", id, "purchases"] });
      void queryClient.invalidateQueries({ queryKey: ["credit-cards", id, "invoices"] });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
