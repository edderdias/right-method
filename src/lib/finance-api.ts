import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  Account,
  Category,
  CreateAccountInput,
  CreateExpenseInput,
  CreateRevenueInput,
  DashboardPeriodParams,
  DashboardSummary,
  Expense,
  ExpenseFilters,
  ExpenseListResponse,
  ExpensesByCategoryPoint,
  ExpensesEvolutionPoint,
  Revenue,
  RevenueFilters,
  RevenueListResponse,
  RevenuesByCategoryPoint,
  RevenuesEvolutionPoint,
  UpdateExpenseInput,
  UpdateRevenueInput,
} from "@/types/finance";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function listRevenues(filters: RevenueFilters = {}): Promise<RevenueListResponse> {
  const { data } = await apiGet<ApiEnvelope<RevenueListResponse>>("/revenues", { ...filters });
  return data;
}

export async function getRevenue(id: string): Promise<Revenue> {
  const { data } = await apiGet<ApiEnvelope<Revenue>>(`/revenues/${id}`);
  return data;
}

export async function createRevenue(payload: CreateRevenueInput): Promise<Revenue> {
  const { data } = await apiPost<ApiEnvelope<Revenue>>("/revenues", payload);
  return data;
}

export async function updateRevenue(id: string, payload: UpdateRevenueInput): Promise<Revenue> {
  const { data } = await apiPatch<ApiEnvelope<Revenue>>(`/revenues/${id}`, payload);
  return data;
}

export async function deleteRevenue(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<null>>(`/revenues/${id}`);
}

export async function listAccounts(): Promise<Account[]> {
  const { data } = await apiGet<ApiEnvelope<Account[]>>("/accounts");
  return data;
}

export async function createAccount(payload: CreateAccountInput): Promise<Account> {
  const { data } = await apiPost<ApiEnvelope<Account>>("/accounts", payload);
  return data;
}

export async function listRevenueCategories(): Promise<Category[]> {
  const { data } = await apiGet<ApiEnvelope<Category[]>>("/categories", { type: "REVENUE" });
  return data;
}

export async function listExpenses(filters: ExpenseFilters = {}): Promise<ExpenseListResponse> {
  const { data } = await apiGet<ApiEnvelope<ExpenseListResponse>>("/expenses", { ...filters });
  return data;
}

export async function getExpense(id: string): Promise<Expense> {
  const { data } = await apiGet<ApiEnvelope<Expense>>(`/expenses/${id}`);
  return data;
}

export async function createExpense(payload: CreateExpenseInput): Promise<Expense> {
  const { data } = await apiPost<ApiEnvelope<Expense>>("/expenses", payload);
  return data;
}

export async function updateExpense(id: string, payload: UpdateExpenseInput): Promise<Expense> {
  const { data } = await apiPatch<ApiEnvelope<Expense>>(`/expenses/${id}`, payload);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<null>>(`/expenses/${id}`);
}

export async function listExpenseCategories(): Promise<Category[]> {
  const { data } = await apiGet<ApiEnvelope<Category[]>>("/categories", { type: "EXPENSE" });
  return data;
}

export async function getDashboardSummary(
  period: DashboardPeriodParams = {},
): Promise<DashboardSummary> {
  const { data } = await apiGet<ApiEnvelope<DashboardSummary>>("/dashboard/summary", { ...period });
  return data;
}

export async function getRevenuesEvolution(months = 6): Promise<RevenuesEvolutionPoint[]> {
  const { data } = await apiGet<ApiEnvelope<RevenuesEvolutionPoint[]>>(
    "/dashboard/revenues-evolution",
    {
      months,
    },
  );
  return data;
}

export async function getRevenuesByCategory(
  period: DashboardPeriodParams = {},
): Promise<RevenuesByCategoryPoint[]> {
  const { data } = await apiGet<ApiEnvelope<RevenuesByCategoryPoint[]>>(
    "/dashboard/revenues-by-category",
    { ...period },
  );
  return data;
}

export async function getExpensesEvolution(months = 6): Promise<ExpensesEvolutionPoint[]> {
  const { data } = await apiGet<ApiEnvelope<ExpensesEvolutionPoint[]>>(
    "/dashboard/expenses-evolution",
    {
      months,
    },
  );
  return data;
}

export async function getExpensesByCategory(
  period: DashboardPeriodParams = {},
): Promise<ExpensesByCategoryPoint[]> {
  const { data } = await apiGet<ApiEnvelope<ExpensesByCategoryPoint[]>>(
    "/dashboard/expenses-by-category",
    { ...period },
  );
  return data;
}
