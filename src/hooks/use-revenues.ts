import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createAccount,
  createRevenue,
  deleteRevenue,
  getDashboardSummary,
  getRevenuesByCategory,
  getRevenuesEvolution,
  listAccounts,
  listRevenueCategories,
  listRevenues,
  updateRevenue,
} from "@/lib/finance-api";
import type {
  CreateAccountInput,
  CreateRevenueInput,
  DashboardPeriodParams,
  RevenueFilters,
  UpdateRevenueInput,
} from "@/types/finance";

export const revenueKeys = {
  all: ["revenues"] as const,
  list: (filters: RevenueFilters) => ["revenues", "list", filters] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (period: DashboardPeriodParams) => ["dashboard", "summary", period] as const,
  evolution: (months: number) => ["dashboard", "revenues-evolution", months] as const,
  byCategory: (period: DashboardPeriodParams) =>
    ["dashboard", "revenues-by-category", period] as const,
};

export const accountKeys = { list: ["accounts"] as const };
export const categoryKeys = { revenueList: ["categories", "REVENUE"] as const };

const GENERIC_ERROR_MESSAGE = "Não foi possível salvar a receita. Tente novamente.";

function invalidateFinanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: revenueKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useRevenues(filters: RevenueFilters) {
  return useQuery({
    queryKey: revenueKeys.list(filters),
    queryFn: () => listRevenues(filters),
  });
}

export function useCreateRevenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRevenueInput) => createRevenue(payload),
    onSuccess: () => {
      toast.success("Receita cadastrada com sucesso!");
      invalidateFinanceQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateRevenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRevenueInput }) =>
      updateRevenue(id, payload),
    onSuccess: () => {
      toast.success("Receita atualizada com sucesso!");
      invalidateFinanceQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDeleteRevenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRevenue(id),
    onSuccess: () => {
      toast.success("Receita excluída com sucesso!");
      invalidateFinanceQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.list,
    queryFn: listAccounts,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountInput) => createAccount(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.list });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useRevenueCategories() {
  return useQuery({
    queryKey: categoryKeys.revenueList,
    queryFn: listRevenueCategories,
  });
}

export function useDashboardSummary(period: DashboardPeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.summary(period),
    queryFn: () => getDashboardSummary(period),
  });
}

export function useRevenuesEvolution(months: number) {
  return useQuery({
    queryKey: dashboardKeys.evolution(months),
    queryFn: () => getRevenuesEvolution(months),
  });
}

export function useRevenuesByCategory(period: DashboardPeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.byCategory(period),
    queryFn: () => getRevenuesByCategory(period),
  });
}
