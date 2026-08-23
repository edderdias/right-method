import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  CreateFinancialGoalInput,
  CreateGoalTransactionInput,
  FinancialGoal,
  FinancialGoalDetail,
  FinancialGoalsSummary,
  GoalTransaction,
  LinkedInvestment,
  UpdateFinancialGoalInput,
} from "@/types/financial-goal";

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function listFinancialGoals(): Promise<FinancialGoal[]> {
  const { data } = await apiGet<ApiEnvelope<FinancialGoal[]>>("/goals");
  return data;
}

export async function getFinancialGoalsSummary(): Promise<FinancialGoalsSummary> {
  const { data } = await apiGet<ApiEnvelope<FinancialGoalsSummary>>("/goals/summary");
  return data;
}

export async function getFinancialGoal(id: string): Promise<FinancialGoalDetail> {
  const { data } = await apiGet<ApiEnvelope<FinancialGoalDetail>>(`/goals/${id}`);
  return data;
}

export async function createFinancialGoal(input: CreateFinancialGoalInput): Promise<FinancialGoal> {
  const { data } = await apiPost<ApiEnvelope<FinancialGoal>>("/goals", input);
  return data;
}

export async function updateFinancialGoal(
  id: string,
  input: UpdateFinancialGoalInput,
): Promise<FinancialGoal> {
  const { data } = await apiPatch<ApiEnvelope<FinancialGoal>>(`/goals/${id}`, input);
  return data;
}

export async function removeFinancialGoal(id: string): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/goals/${id}`);
}

export async function listGoalTransactions(goalId: string): Promise<GoalTransaction[]> {
  const { data } = await apiGet<ApiEnvelope<GoalTransaction[]>>(`/goals/${goalId}/transactions`);
  return data;
}

export async function createGoalTransaction(
  goalId: string,
  input: CreateGoalTransactionInput,
): Promise<GoalTransaction> {
  const { data } = await apiPost<ApiEnvelope<GoalTransaction>>(
    `/goals/${goalId}/transactions`,
    input,
  );
  return data;
}

export async function removeGoalTransaction(
  goalId: string,
  transactionId: string,
): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/goals/${goalId}/transactions/${transactionId}`);
}

export async function linkGoalInvestment(
  goalId: string,
  investmentId: string,
): Promise<LinkedInvestment> {
  const { data } = await apiPost<ApiEnvelope<LinkedInvestment>>(`/goals/${goalId}/investments`, {
    investmentId,
  });
  return data;
}

export async function unlinkGoalInvestment(
  goalId: string,
  investmentId: string,
): Promise<{ message: string }> {
  return apiDelete<ApiEnvelope<null>>(`/goals/${goalId}/investments/${investmentId}`);
}
