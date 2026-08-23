import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  CreateInvestmentIncomeInput,
  CreateInvestmentInput,
  CreateInvestmentTransactionInput,
  Investment,
  InvestmentIncome,
  InvestmentSummary,
  InvestmentTransaction,
  UpdateInvestmentInput,
} from "@/types/investment";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function listInvestments(): Promise<Investment[]> {
  const { data } = await apiGet<ApiEnvelope<Investment[]>>("/investments");
  return data;
}

export async function getInvestmentsSummary(): Promise<InvestmentSummary> {
  const { data } = await apiGet<ApiEnvelope<InvestmentSummary>>("/investments/summary");
  return data;
}

export async function getInvestment(id: string): Promise<Investment> {
  const { data } = await apiGet<ApiEnvelope<Investment>>(`/investments/${id}`);
  return data;
}

export async function createInvestment(input: CreateInvestmentInput): Promise<Investment> {
  const { data } = await apiPost<ApiEnvelope<Investment>>("/investments", input);
  return data;
}

export async function updateInvestment(
  id: string,
  input: UpdateInvestmentInput,
): Promise<Investment> {
  const { data } = await apiPatch<ApiEnvelope<Investment>>(`/investments/${id}`, input);
  return data;
}

export async function removeInvestment(id: string): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/investments/${id}`);
}

export async function listInvestmentTransactions(
  investmentId: string,
): Promise<InvestmentTransaction[]> {
  const { data } = await apiGet<ApiEnvelope<InvestmentTransaction[]>>(
    `/investments/${investmentId}/transactions`,
  );
  return data;
}

export async function createInvestmentTransaction(
  investmentId: string,
  input: CreateInvestmentTransactionInput,
): Promise<InvestmentTransaction> {
  const { data } = await apiPost<ApiEnvelope<InvestmentTransaction>>(
    `/investments/${investmentId}/transactions`,
    input,
  );
  return data;
}

export async function removeInvestmentTransaction(
  investmentId: string,
  transactionId: string,
): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/investments/${investmentId}/transactions/${transactionId}`);
}

export async function listInvestmentIncomes(investmentId: string): Promise<InvestmentIncome[]> {
  const { data } = await apiGet<ApiEnvelope<InvestmentIncome[]>>(
    `/investments/${investmentId}/incomes`,
  );
  return data;
}

export async function createInvestmentIncome(
  investmentId: string,
  input: CreateInvestmentIncomeInput,
): Promise<InvestmentIncome> {
  const { data } = await apiPost<ApiEnvelope<InvestmentIncome>>(
    `/investments/${investmentId}/incomes`,
    input,
  );
  return data;
}

export async function removeInvestmentIncome(
  investmentId: string,
  incomeId: string,
): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/investments/${investmentId}/incomes/${incomeId}`);
}
