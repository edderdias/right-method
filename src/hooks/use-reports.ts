import { useQuery } from "@tanstack/react-query";

import {
  getReportCashFlow,
  getReportExpensesByCategory,
  getReportSummary,
  getReportTopExpenses,
} from "@/lib/reports-api";
import type { ReportsQueryParams } from "@/types/report";

export const reportKeys = {
  summary: (params: ReportsQueryParams) => ["reports", "summary", params] as const,
  cashFlow: (params: ReportsQueryParams) => ["reports", "cash-flow", params] as const,
  expensesByCategory: (params: ReportsQueryParams) =>
    ["reports", "expenses-by-category", params] as const,
  topExpenses: (params: ReportsQueryParams & { limit?: number }) =>
    ["reports", "top-expenses", params] as const,
};

export function useReportSummary(params: ReportsQueryParams) {
  return useQuery({
    queryKey: reportKeys.summary(params),
    queryFn: () => getReportSummary(params),
  });
}

export function useReportCashFlow(params: ReportsQueryParams) {
  return useQuery({
    queryKey: reportKeys.cashFlow(params),
    queryFn: () => getReportCashFlow(params),
  });
}

export function useReportExpensesByCategory(params: ReportsQueryParams) {
  return useQuery({
    queryKey: reportKeys.expensesByCategory(params),
    queryFn: () => getReportExpensesByCategory(params),
  });
}

export function useReportTopExpenses(params: ReportsQueryParams & { limit?: number }) {
  return useQuery({
    queryKey: reportKeys.topExpenses(params),
    queryFn: () => getReportTopExpenses(params),
  });
}
