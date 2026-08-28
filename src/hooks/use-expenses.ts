import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpensesEvolution,
  listExpenseCategories,
  listExpenses,
  updateExpense,
} from "@/lib/finance-api";
import { accountKeys, dashboardKeys } from "@/hooks/use-revenues";
import type {
  CreateExpenseInput,
  DashboardPeriodParams,
  ExpenseFilters,
  UpdateExpenseInput,
} from "@/types/finance";

export const expenseKeys = {
  all: ["expenses"] as const,
  list: (filters: ExpenseFilters) => ["expenses", "list", filters] as const,
};

export const expensesDashboardKeys = {
  evolution: (months: number) => ["dashboard", "expenses-evolution", months] as const,
  byCategory: (period: DashboardPeriodParams) =>
    ["dashboard", "expenses-by-category", period] as const,
};

export const expenseCategoryKeys = { list: ["categories", "EXPENSE"] as const };

const GENERIC_ERROR_MESSAGE = "Não foi possível salvar a despesa. Tente novamente.";

function invalidateFinanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  void queryClient.invalidateQueries({ queryKey: accountKeys.all });
}

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: () => listExpenses(filters),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpenseInput) => createExpense(payload),
    onSuccess: () => {
      toast.success("Despesa cadastrada com sucesso!");
      invalidateFinanceQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpenseInput }) =>
      updateExpense(id, payload),
    onSuccess: () => {
      toast.success("Despesa atualizada com sucesso!");
      invalidateFinanceQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      toast.success("Despesa excluída com sucesso!");
      invalidateFinanceQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseCategoryKeys.list,
    queryFn: listExpenseCategories,
  });
}

export function useExpensesEvolution(months: number) {
  return useQuery({
    queryKey: expensesDashboardKeys.evolution(months),
    queryFn: () => getExpensesEvolution(months),
  });
}

export function useExpensesByCategory(period: DashboardPeriodParams) {
  return useQuery({
    queryKey: expensesDashboardKeys.byCategory(period),
    queryFn: () => getExpensesByCategory(period),
  });
}
