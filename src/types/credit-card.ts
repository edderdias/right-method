import type { Category } from "@/types/finance";
import type { AvailablePluggyAccount } from "@/types/open-finance";

export type CreditCardSource = "MANUAL" | "OPEN_FINANCE";
export type CreditCardStatus = "ACTIVE" | "ARCHIVED";
export type CreditCardInvoiceStatus = "OPEN" | "CLOSED" | "DUE" | "PAID" | "OVERDUE";
export type CardPurchaseSource = "MANUAL" | "OPEN_FINANCE";

export interface CreditCard {
  id: string;
  connectionId: string | null;
  externalCardId: string | null;
  institutionName: string | null;
  name: string;
  brand: string | null;
  lastFourDigits: string | null;
  creditLimit: number | null;
  availableLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  source: CreditCardSource;
  status: CreditCardStatus;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardSummary {
  cardCount: number;
  totalLimit: number;
  totalAvailable: number;
  totalUsed: number;
  openInvoicesTotal: number;
}

export interface CreditCardPurchase {
  id: string;
  cardId: string;
  invoiceId: string;
  externalTransactionId: string | null;
  description: string;
  merchantName: string | null;
  amount: number;
  purchaseDate: string;
  categoryId: string | null;
  category: Category | null;
  responsibleName: string | null;
  source: CardPurchaseSource;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardPurchaseListResponse {
  items: CreditCardPurchase[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreditCardPurchaseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  invoiceId?: string;
  responsibleName?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ResponsibleSummary {
  responsibleName: string | null;
  total: number;
  count: number;
}

export interface ResponsiblesSummaryFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  invoiceId?: string;
}

export interface CreditCardInvoice {
  id: string;
  cardId: string;
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: CreditCardInvoiceStatus;
  paidAt: string | null;
  paidFromAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardInvoiceDetail extends CreditCardInvoice {
  purchases: CreditCardPurchase[];
}

export interface CreateCreditCardInput {
  name: string;
  brand?: string;
  lastFourDigits?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export type UpdateCreditCardInput = Partial<CreateCreditCardInput>;

export interface CreatePurchaseInput {
  description: string;
  amount: number;
  purchaseDate: string;
  categoryId?: string;
  responsibleName?: string;
  totalInstallments?: number;
  notes?: string;
}

export interface UpdatePurchaseInput {
  description?: string;
  purchaseDate?: string;
  categoryId?: string | null;
  responsibleName?: string | null;
  notes?: string;
}

export type RemovePurchaseScope = "one" | "group";

export interface PayInvoiceInput {
  accountId: string;
  paidAt?: string;
}

export type AvailableOpenFinanceCreditCard = AvailablePluggyAccount;
