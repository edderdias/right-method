export type RevenueStatus = "PENDING" | "RECEIVED" | "OVERDUE";
export type CreatableRevenueStatus = "PENDING" | "RECEIVED";
export type ExpenseStatus = "PENDING" | "PAID" | "OVERDUE";
export type CreatableExpenseStatus = "PENDING" | "PAID";
export type RecurrenceType = "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "YEARLY" | "CUSTOM";
export type CategoryType = "REVENUE" | "EXPENSE";

export interface Account {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  userId: string | null;
  createdAt: string;
}

export interface Revenue {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  category: Category;
  accountId: string;
  account: Account;
  dueDate: string;
  receivedAt: string | null;
  status: RevenueStatus;
  notes: string | null;
  isRecurring: boolean;
  recurrenceType: RecurrenceType | null;
  recurrenceEndDate: string | null;
  parentRevenueId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueListResponse {
  items: Revenue[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RevenueFilters {
  month?: number;
  year?: number;
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  status?: RevenueStatus;
  isRecurring?: boolean;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateRevenueInput {
  description: string;
  amount: number;
  categoryId: string;
  accountId: string;
  dueDate: string;
  receivedAt?: string;
  status?: CreatableRevenueStatus;
  notes?: string;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: string;
}

export type UpdateRevenueInput = Partial<CreateRevenueInput>;

export interface Expense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  category: Category;
  accountId: string;
  account: Account;
  dueDate: string;
  paidAt: string | null;
  status: ExpenseStatus;
  notes: string | null;
  isRecurring: boolean;
  recurrenceType: RecurrenceType | null;
  recurrenceEndDate: string | null;
  parentExpenseId: string | null;
  isInstallment: boolean;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  creditCardId: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseListResponse {
  items: Expense[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExpenseFilters {
  month?: number;
  year?: number;
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  status?: ExpenseStatus;
  isRecurring?: boolean;
  installmentGroupId?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  categoryId: string;
  accountId: string;
  dueDate: string;
  paidAt?: string;
  status?: CreatableExpenseStatus;
  notes?: string;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: string;
  isInstallment?: boolean;
  totalInstallments?: number;
  creditCardId?: string;
  attachmentUrl?: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface CreateAccountInput {
  name: string;
  initialBalance?: number;
}

export interface DashboardPeriodParams {
  month?: number;
  year?: number;
  from?: string;
  to?: string;
  preset?: "last30days" | "last6months";
}

export interface DashboardSummary {
  currentBalance: number;
  period: { from: string; to: string };
  income: { total: number; pending: number; overdue: number };
  expenses: { total: number; pending: number; overdue: number };
  monthlySavings: number;
}

export interface RevenuesEvolutionPoint {
  month: string;
  total: number;
}

export interface RevenuesByCategoryPoint {
  categoryId: string;
  name: string;
  total: number;
}

export type ExpensesEvolutionPoint = RevenuesEvolutionPoint;
export type ExpensesByCategoryPoint = RevenuesByCategoryPoint;
