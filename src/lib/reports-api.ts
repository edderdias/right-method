import { apiGet } from "@/lib/api-client";
import type {
  ReportCashFlow,
  ReportExpenseByCategory,
  ReportsQueryParams,
  ReportSummary,
  ReportTopExpense,
} from "@/types/report";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function getReportSummary(params: ReportsQueryParams = {}): Promise<ReportSummary> {
  const { data } = await apiGet<ApiEnvelope<ReportSummary>>("/reports/summary", { ...params });
  return data;
}

export async function getReportCashFlow(params: ReportsQueryParams = {}): Promise<ReportCashFlow> {
  const { data } = await apiGet<ApiEnvelope<ReportCashFlow>>("/reports/cash-flow", { ...params });
  return data;
}

export async function getReportExpensesByCategory(
  params: ReportsQueryParams = {},
): Promise<ReportExpenseByCategory[]> {
  const { data } = await apiGet<ApiEnvelope<ReportExpenseByCategory[]>>(
    "/reports/expenses-by-category",
    { ...params },
  );
  return data;
}

export async function getReportTopExpenses(
  params: ReportsQueryParams & { limit?: number } = {},
): Promise<ReportTopExpense[]> {
  const { data } = await apiGet<ApiEnvelope<ReportTopExpense[]>>("/reports/top-expenses", {
    ...params,
  });
  return data;
}
