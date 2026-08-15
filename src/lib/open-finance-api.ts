import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  BankTransaction,
  BankTransactionFilters,
  BankTransactionListResponse,
  ConnectedAccount,
  OpenFinanceConnection,
  RegisterConnectionResponse,
  UpdateTransactionInput,
} from "@/types/open-finance";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function createConnectToken(itemId?: string): Promise<string> {
  const { data } = await apiPost<ApiEnvelope<{ accessToken: string }>>(
    "/open-finance/connect-token",
    {
      ...(itemId ? { itemId } : {}),
    },
  );
  return data.accessToken;
}

export async function createConnection(itemId: string): Promise<RegisterConnectionResponse> {
  const { data } = await apiPost<ApiEnvelope<RegisterConnectionResponse>>(
    "/open-finance/connections",
    {
      itemId,
    },
  );
  return data;
}

export async function listConnections(): Promise<OpenFinanceConnection[]> {
  const { data } = await apiGet<ApiEnvelope<OpenFinanceConnection[]>>("/open-finance/connections");
  return data;
}

export async function selectAccounts(
  connectionId: string,
  externalAccountIds: string[],
): Promise<ConnectedAccount[]> {
  const { data } = await apiPost<ApiEnvelope<ConnectedAccount[]>>(
    `/open-finance/connections/${connectionId}/accounts`,
    { externalAccountIds },
  );
  return data;
}

export async function disconnectConnection(connectionId: string): Promise<void> {
  await apiDelete<ApiEnvelope<null>>(`/open-finance/connections/${connectionId}`);
}

export async function listConnectedAccounts(): Promise<ConnectedAccount[]> {
  const { data } = await apiGet<ApiEnvelope<ConnectedAccount[]>>("/open-finance/accounts");
  return data;
}

export async function getConnectedAccount(id: string): Promise<ConnectedAccount> {
  const { data } = await apiGet<ApiEnvelope<ConnectedAccount>>(`/open-finance/accounts/${id}`);
  return data;
}

export async function syncAccount(
  id: string,
): Promise<{ account: ConnectedAccount; message: string }> {
  const response = await apiPost<ApiEnvelope<ConnectedAccount>>(
    `/open-finance/accounts/${id}/sync`,
    {},
  );
  return { account: response.data, message: response.message };
}

export async function disconnectAccount(id: string, keepHistory = true): Promise<void> {
  await apiDelete<ApiEnvelope<null>>(`/open-finance/accounts/${id}?keepHistory=${keepHistory}`);
}

export async function listAccountTransactions(
  accountId: string,
  filters: BankTransactionFilters = {},
): Promise<BankTransactionListResponse> {
  const { data } = await apiGet<ApiEnvelope<BankTransactionListResponse>>(
    `/open-finance/accounts/${accountId}/transactions`,
    { ...filters },
  );
  return data;
}

export async function getTransaction(id: string): Promise<BankTransaction> {
  const { data } = await apiGet<ApiEnvelope<BankTransaction>>(`/open-finance/transactions/${id}`);
  return data;
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionInput,
): Promise<BankTransaction> {
  const { data } = await apiPatch<ApiEnvelope<BankTransaction>>(
    `/open-finance/transactions/${id}`,
    payload,
  );
  return data;
}
