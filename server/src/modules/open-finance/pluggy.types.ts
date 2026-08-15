/** Shapes returned by the Pluggy REST API (https://docs.pluggy.ai) — only the fields we use. */

export interface PluggyAuthResponse {
  apiKey: string;
}

export interface PluggyConnectTokenResponse {
  accessToken: string;
}

export type PluggyItemStatus =
  "UPDATED" | "UPDATING" | "WAITING_USER_INPUT" | "LOGIN_ERROR" | "OUTDATED" | "ERROR";

export interface PluggyItem {
  id: string;
  status: PluggyItemStatus;
  executionStatus?: string;
  connector: {
    id: number;
    name: string;
    imageUrl?: string;
  };
}

export type PluggyAccountType = "BANK" | "CREDIT";

export interface PluggyAccount {
  id: string;
  itemId: string;
  type: PluggyAccountType;
  subtype: string;
  number: string;
  name: string;
  marketingName?: string | null;
  balance: number;
  currencyCode: string;
}

interface PluggyPaginated<T> {
  page: number;
  total: number;
  totalPages: number;
  results: T[];
}

export type PluggyAccountsResponse = PluggyPaginated<PluggyAccount>;

export type PluggyTransactionType = "CREDIT" | "DEBIT";

export interface PluggyTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  descriptionRaw?: string | null;
  amount: number;
  type: PluggyTransactionType;
  status: "PENDING" | "POSTED";
  merchant?: { name?: string | null } | null;
  category?: string | null;
}

export interface PluggyTransactionsResponse {
  results: PluggyTransaction[];
  /** Cursor for the next page, or null when there is no more data. */
  next: string | null;
}
