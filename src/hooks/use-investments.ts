import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createInvestment,
  createInvestmentIncome,
  createInvestmentTransaction,
  getInvestment,
  getInvestmentsSummary,
  listInvestmentIncomes,
  listInvestments,
  listInvestmentTransactions,
  removeInvestment,
  removeInvestmentIncome,
  removeInvestmentTransaction,
  updateInvestment,
} from "@/lib/investments-api";
import type {
  CreateInvestmentIncomeInput,
  CreateInvestmentInput,
  CreateInvestmentTransactionInput,
  UpdateInvestmentInput,
} from "@/types/investment";

export const investmentKeys = {
  all: ["investments"] as const,
  summary: ["investments", "summary"] as const,
  investment: (id: string) => ["investments", id] as const,
  transactions: (investmentId: string) => ["investments", investmentId, "transactions"] as const,
  incomes: (investmentId: string) => ["investments", investmentId, "incomes"] as const,
};

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useInvestments() {
  return useQuery({ queryKey: investmentKeys.all, queryFn: listInvestments });
}

export function useInvestmentsSummary() {
  return useQuery({ queryKey: investmentKeys.summary, queryFn: getInvestmentsSummary });
}

export function useInvestment(id: string) {
  return useQuery({
    queryKey: investmentKeys.investment(id),
    queryFn: () => getInvestment(id),
    enabled: Boolean(id),
  });
}

export function useInvestmentTransactions(investmentId: string) {
  return useQuery({
    queryKey: investmentKeys.transactions(investmentId),
    queryFn: () => listInvestmentTransactions(investmentId),
    enabled: Boolean(investmentId),
  });
}

export function useInvestmentIncomes(investmentId: string) {
  return useQuery({
    queryKey: investmentKeys.incomes(investmentId),
    queryFn: () => listInvestmentIncomes(investmentId),
    enabled: Boolean(investmentId),
  });
}

function invalidateInvestmentAndSummary(
  queryClient: ReturnType<typeof useQueryClient>,
  investmentId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: investmentKeys.all });
  void queryClient.invalidateQueries({ queryKey: investmentKeys.summary });
  if (investmentId) {
    void queryClient.invalidateQueries({ queryKey: investmentKeys.investment(investmentId) });
  }
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvestmentInput) => createInvestment(input),
    onSuccess: () => {
      toast.success("Investimento cadastrado com sucesso!");
      invalidateInvestmentAndSummary(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInvestmentInput }) =>
      updateInvestment(id, input),
    onSuccess: (investment) => {
      toast.success("Investimento atualizado com sucesso!");
      invalidateInvestmentAndSummary(queryClient, investment.id);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useArchiveInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeInvestment(id),
    onSuccess: (result) => {
      toast.success(result.message);
      invalidateInvestmentAndSummary(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      investmentId,
      input,
    }: {
      investmentId: string;
      input: CreateInvestmentTransactionInput;
    }) => createInvestmentTransaction(investmentId, input),
    onSuccess: (transaction) => {
      toast.success("Lançamento registrado com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: investmentKeys.transactions(transaction.investmentId),
      });
      invalidateInvestmentAndSummary(queryClient, transaction.investmentId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRemoveTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      investmentId,
      transactionId,
    }: {
      investmentId: string;
      transactionId: string;
    }) => removeInvestmentTransaction(investmentId, transactionId),
    onSuccess: (_result, variables) => {
      toast.success("Lançamento excluído com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: investmentKeys.transactions(variables.investmentId),
      });
      invalidateInvestmentAndSummary(queryClient, variables.investmentId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      investmentId,
      input,
    }: {
      investmentId: string;
      input: CreateInvestmentIncomeInput;
    }) => createInvestmentIncome(investmentId, input),
    onSuccess: (income) => {
      toast.success("Rendimento registrado com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: investmentKeys.incomes(income.investmentId),
      });
      invalidateInvestmentAndSummary(queryClient, income.investmentId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRemoveIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investmentId, incomeId }: { investmentId: string; incomeId: string }) =>
      removeInvestmentIncome(investmentId, incomeId),
    onSuccess: (_result, variables) => {
      toast.success("Rendimento excluído com sucesso!");
      void queryClient.invalidateQueries({
        queryKey: investmentKeys.incomes(variables.investmentId),
      });
      invalidateInvestmentAndSummary(queryClient, variables.investmentId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
