import type { Category } from "@/types/finance";

export type ConnectionStatus =
  "CONNECTED" | "SYNCING" | "REQUIRES_REAUTH" | "EXPIRED" | "ERROR" | "DISCONNECTED";

export type BankTransactionType = "CREDIT" | "DEBIT";

export interface OpenFinanceConnectionSummary {
  id: string;
  institutionName: string;
  institutionImageUrl: string | null;
  status: ConnectionStatus;
}

export interface ConnectedAccount {
  id: string;
  connectionId: string;
  externalAccountId: string;
  accountType: string;
  accountSubtype: string;
  name: string;
  marketingName: string | null;
  numberMasked: string | null;
  balance: number;
  currencyCode: string;
  status: ConnectionStatus;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  connection: OpenFinanceConnectionSummary;
}

export interface OpenFinanceConnection {
  id: string;
  providerItemId: string;
  institutionName: string;
  institutionImageUrl: string | null;
  status: ConnectionStatus;
  statusDetail: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  accounts: ConnectedAccount[];
}

/** A Pluggy account not yet imported into the Método Certo — returned right after connecting. */
export interface AvailablePluggyAccount {
  id: string;
  type: "BANK" | "CREDIT";
  subtype: string;
  number: string;
  name: string;
  marketingName?: string | null;
  balance: number;
  currencyCode: string;
}

export interface RegisterConnectionResponse {
  connection: OpenFinanceConnection;
  availableAccounts: AvailablePluggyAccount[];
}

export interface BankTransaction {
  id: string;
  accountId: string;
  externalTransactionId: string;
  description: string;
  merchantName: string | null;
  amount: number;
  type: BankTransactionType;
  status: string;
  transactionDate: string;
  categoryId: string | null;
  category: Category | null;
  notes: string | null;
  source: "MANUAL" | "OPEN_FINANCE" | "CARD";
  createdAt: string;
  updatedAt: string;
}

export interface BankTransactionListResponse {
  items: BankTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BankTransactionFilters {
  from?: string;
  to?: string;
  type?: BankTransactionType;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateTransactionInput {
  categoryId?: string | null;
  notes?: string;
}
