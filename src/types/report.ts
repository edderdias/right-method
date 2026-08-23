export type ReportPeriodPreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year";

export interface ReportsQueryParams {
  preset?: ReportPeriodPreset;
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
}

export interface ReportPeriodTotals {
  period: { from: string; to: string };
  income: number;
  expenses: number;
  balance: number;
  savingsRatePct: number;
}

export interface ReportSummary {
  current: ReportPeriodTotals;
  previous: ReportPeriodTotals;
  variation: {
    incomePct: number | null;
    expensesPct: number | null;
    balancePct: number | null;
  };
}

export interface ReportCashFlow {
  period: { from: string; to: string };
  openingBalance: number;
  income: number;
  expenses: number;
  closingBalance: number;
}

export interface ReportExpenseByCategory {
  categoryId: string;
  name: string;
  total: number;
  count: number;
  percentage: number;
}

export interface ReportTopExpense {
  id: string;
  description: string;
  amount: number;
  paidAt: string;
  categoryId: string;
  categoryName: string;
}
