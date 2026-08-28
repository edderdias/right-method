import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createAccount,
  createRevenue,
  deleteAccount,
  deleteAccountTransfer,
  deleteRevenue,
  getAccountsSummary,
  getDashboardInsights,
  getDashboardSummary,
  getRevenuesByCategory,
  getRevenuesEvolution,
  getUpcomingBills,
  listAccounts,
  listAccountTransfers,
  listRevenueCategories,
  listRevenues,
  transferBetweenAccounts,
  updateAccount,
  updateRevenue,
} from "@/lib/finance-api";
import type {
  CreateAccountInput,
  CreateRevenueInput,
  CreateTransferInput,
  DashboardPeriodParams,
  RevenueFilters,
  UpdateAccountInput,
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

export const accountKeys = {
  all: ["accounts"] as const,
  list: ["accounts"] as const,
  transfers: ["accounts", "transfers"] as const,
  summary: (period: DashboardPeriodParams) => ["accounts", "summary", period] as const,
};
export const categoryKeys = { revenueList: ["categories", "REVENUE"] as const };

const GENERIC_ERROR_MESSAGE = "Não foi possível salvar a receita. Tente novamente.";

function invalidateFinanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: revenueKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  void queryClient.invalidateQueries({ queryKey: accountKeys.all });
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
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

function invalidateAccountQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: accountKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountInput }) =>
      updateAccount(id, payload),
    onSuccess: () => {
      toast.success("Conta atualizada com sucesso!");
      invalidateAccountQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      toast.success("Conta excluída com sucesso!");
      invalidateAccountQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useAccountTransfers() {
  return useQuery({
    queryKey: accountKeys.transfers,
    queryFn: listAccountTransfers,
  });
}

export function useTransferBetweenAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransferInput) => transferBetweenAccounts(payload),
    onSuccess: (result) => {
      toast.success(
        result.insufficientFunds
          ? "Transferência registrada — atenção: a conta de origem ficou com saldo negativo."
          : "Transferência realizada com sucesso!",
      );
      invalidateAccountQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDeleteAccountTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccountTransfer(id),
    onSuccess: () => {
      toast.success("Transferência estornada com sucesso!");
      invalidateAccountQueries(queryClient);
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useAccountsSummary(period: DashboardPeriodParams) {
  return useQuery({
    queryKey: accountKeys.summary(period),
    queryFn: () => getAccountsSummary(period),
  });
}

export function useUpcomingBills() {
  return useQuery({
    queryKey: ["dashboard", "upcoming-bills"],
    queryFn: getUpcomingBills,
  });
}

export function useDashboardInsights() {
  return useQuery({
    queryKey: ["dashboard", "insights"],
    queryFn: getDashboardInsights,
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
