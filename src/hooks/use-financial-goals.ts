import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createFinancialGoal,
  createGoalTransaction,
  getFinancialGoal,
  getFinancialGoalsSummary,
  linkGoalInvestment,
  listFinancialGoals,
  listGoalTransactions,
  removeFinancialGoal,
  removeGoalTransaction,
  unlinkGoalInvestment,
  updateFinancialGoal,
} from "@/lib/financial-goals-api";
import type {
  CreateFinancialGoalInput,
  CreateGoalTransactionInput,
  UpdateFinancialGoalInput,
} from "@/types/financial-goal";

export const goalKeys = {
  all: ["goals"] as const,
  summary: ["goals", "summary"] as const,
  goal: (id: string) => ["goals", id] as const,
  transactions: (goalId: string) => ["goals", goalId, "transactions"] as const,
};

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useFinancialGoals() {
  return useQuery({ queryKey: goalKeys.all, queryFn: listFinancialGoals });
}

export function useFinancialGoalsSummary() {
  return useQuery({ queryKey: goalKeys.summary, queryFn: getFinancialGoalsSummary });
}

export function useFinancialGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.goal(id),
    queryFn: () => getFinancialGoal(id),
    enabled: Boolean(id),
  });
}

export function useGoalTransactions(goalId: string) {
  return useQuery({
    queryKey: goalKeys.transactions(goalId),
    queryFn: () => listGoalTransactions(goalId),
    enabled: Boolean(goalId),
  });
}

function invalidateGoalAndSummary(queryClient: ReturnType<typeof useQueryClient>, goalId?: string) {
  void queryClient.invalidateQueries({ queryKey: goalKeys.all });
  void queryClient.invalidateQueries({ queryKey: goalKeys.summary });
  if (goalId) {
    void queryClient.invalidateQueries({ queryKey: goalKeys.goal(goalId) });
  }
}

export function useCreateFinancialGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFinancialGoalInput) => createFinancialGoal(input),
    onSuccess: () => {
      toast.success("Meta criada com sucesso!");
      invalidateGoalAndSummary(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateFinancialGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFinancialGoalInput }) =>
      updateFinancialGoal(id, input),
    onSuccess: (goal) => {
      toast.success("Meta atualizada com sucesso!");
      invalidateGoalAndSummary(queryClient, goal.id);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useArchiveFinancialGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFinancialGoal(id),
    onSuccess: (result) => {
      toast.success(result.message);
      invalidateGoalAndSummary(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useCreateGoalTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: CreateGoalTransactionInput }) =>
      createGoalTransaction(goalId, input),
    onSuccess: (transaction) => {
      toast.success(
        transaction.type === "DEPOSIT"
          ? "Aporte registrado com sucesso!"
          : "Retirada registrada com sucesso!",
      );
      void queryClient.invalidateQueries({ queryKey: goalKeys.transactions(transaction.goalId) });
      invalidateGoalAndSummary(queryClient, transaction.goalId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRemoveGoalTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, transactionId }: { goalId: string; transactionId: string }) =>
      removeGoalTransaction(goalId, transactionId),
    onSuccess: (_result, variables) => {
      toast.success("Lançamento excluído com sucesso!");
      void queryClient.invalidateQueries({ queryKey: goalKeys.transactions(variables.goalId) });
      invalidateGoalAndSummary(queryClient, variables.goalId);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useLinkGoalInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, investmentId }: { goalId: string; investmentId: string }) =>
      linkGoalInvestment(goalId, investmentId),
    onSuccess: (_result, variables) => {
      toast.success("Investimento vinculado à meta!");
      void queryClient.invalidateQueries({ queryKey: goalKeys.goal(variables.goalId) });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUnlinkGoalInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, investmentId }: { goalId: string; investmentId: string }) =>
      unlinkGoalInvestment(goalId, investmentId),
    onSuccess: (_result, variables) => {
      toast.success("Vínculo removido.");
      void queryClient.invalidateQueries({ queryKey: goalKeys.goal(variables.goalId) });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
