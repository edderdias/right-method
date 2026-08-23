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

/** https://docs.pluggy.ai/reference/accounts-retrieve — only present when `type === "CREDIT"`. */
export interface PluggyCreditData {
  level?: string | null;
  brand?: string | null;
  brandAdditionalInfo?: string | null;
  balanceCloseDate?: string | null;
  balanceDueDate?: string | null;
  availableCreditLimit?: number | null;
  creditLimit?: number | null;
  minimumPayment?: number | null;
  isLimitFlexible?: boolean | null;
  status?: "ACTIVE" | "BLOCKED" | "CANCELLED" | null;
  holderType?: "MAIN" | "ADDITIONAL" | null;
}

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
  creditData?: PluggyCreditData | null;
}

interface PluggyPaginated<T> {
  page: number;
  total: number;
  totalPages: number;
  results: T[];
}

export type PluggyAccountsResponse = PluggyPaginated<PluggyAccount>;

export type PluggyTransactionType = "CREDIT" | "DEBIT";

/** https://docs.pluggy.ai/reference/transactions-retrieve — only present for CREDIT account
 * transactions. Billing association happens exclusively via `billId`/`billForecastDate`, there is
 * no separate `invoiceId` field. */
export interface PluggyCreditCardMetadata {
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  totalAmount?: number | null;
  billId?: string | null;
  /** Forecasted bill period as "YYYY-MM", present for still-open/future installments. */
  billForecastDate?: string | null;
  purchaseDate?: string | null;
  cardNumber?: string | null;
  payeeMCC?: number | null;
}

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
  creditCardMetadata?: PluggyCreditCardMetadata | null;
}

export interface PluggyTransactionsResponse {
  results: PluggyTransaction[];
  /** Cursor for the next page, or null when there is no more data. */
  next: string | null;
}

/** https://docs.pluggy.ai/reference/bills-retrieve */
export interface PluggyBill {
  id: string;
  dueDate: string;
  billClosingDate?: string | null;
  totalAmount: number;
  totalAmountCurrencyCode: string;
  minimumPaymentAmount?: number | null;
  allowsInstallments?: boolean | null;
}
