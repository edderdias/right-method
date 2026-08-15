import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createConnectToken,
  createConnection,
  disconnectAccount,
  disconnectConnection,
  getConnectedAccount,
  getTransaction,
  listAccountTransactions,
  listConnectedAccounts,
  listConnections,
  selectAccounts,
  syncAccount,
  updateTransaction,
} from "@/lib/open-finance-api";
import type { BankTransactionFilters, UpdateTransactionInput } from "@/types/open-finance";

export const openFinanceKeys = {
  accounts: ["open-finance", "accounts"] as const,
  account: (id: string) => ["open-finance", "accounts", id] as const,
  connections: ["open-finance", "connections"] as const,
  transactions: (accountId: string, filters: BankTransactionFilters) =>
    ["open-finance", "accounts", accountId, "transactions", filters] as const,
  transaction: (id: string) => ["open-finance", "transactions", id] as const,
};

const GENERIC_ERROR_MESSAGE = "Não foi possível completar a operação. Tente novamente.";

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}

export function useConnectedAccounts() {
  return useQuery({
    queryKey: openFinanceKeys.accounts,
    queryFn: listConnectedAccounts,
  });
}

export function useConnectedAccount(id: string) {
  return useQuery({
    queryKey: openFinanceKeys.account(id),
    queryFn: () => getConnectedAccount(id),
    enabled: Boolean(id),
  });
}

export function useConnections() {
  return useQuery({
    queryKey: openFinanceKeys.connections,
    queryFn: listConnections,
  });
}

export function useAccountTransactions(accountId: string, filters: BankTransactionFilters) {
  return useQuery({
    queryKey: openFinanceKeys.transactions(accountId, filters),
    queryFn: () => listAccountTransactions(accountId, filters),
    enabled: Boolean(accountId),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: openFinanceKeys.transaction(id),
    queryFn: () => getTransaction(id),
    enabled: Boolean(id),
  });
}

export function useCreateConnectToken() {
  return useMutation({
    mutationFn: (itemId?: string) => createConnectToken(itemId),
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useCreateConnection() {
  return useMutation({
    mutationFn: (itemId: string) => createConnection(itemId),
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useSelectAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectionId,
      externalAccountIds,
    }: {
      connectionId: string;
      externalAccountIds: string[];
    }) => selectAccounts(connectionId, externalAccountIds),
    onSuccess: () => {
      toast.success("Contas importadas com sucesso!");
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.accounts });
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.connections });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useSyncAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => syncAccount(id),
    onSuccess: (result, id) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.accounts });
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.account(id) });
      void queryClient.invalidateQueries({
        queryKey: ["open-finance", "accounts", id, "transactions"],
      });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, keepHistory }: { id: string; keepHistory: boolean }) =>
      disconnectAccount(id, keepHistory),
    onSuccess: () => {
      toast.success("Conta desconectada.");
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.accounts });
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.connections });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useDisconnectConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => disconnectConnection(connectionId),
    onSuccess: () => {
      toast.success("Conexão desconectada.");
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.accounts });
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.connections });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionInput }) =>
      updateTransaction(id, payload),
    onSuccess: (transaction) => {
      toast.success("Movimentação atualizada!");
      void queryClient.invalidateQueries({
        queryKey: ["open-finance", "accounts", transaction.accountId, "transactions"],
      });
      void queryClient.invalidateQueries({ queryKey: openFinanceKeys.transaction(transaction.id) });
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
}
