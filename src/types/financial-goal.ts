export type FinancialGoalCategory =
  | "RESERVA_EMERGENCIA"
  | "VIAGEM"
  | "CASA"
  | "CARRO"
  | "EDUCACAO"
  | "APOSENTADORIA"
  | "INVESTIMENTO"
  | "COMPRA"
  | "DIVIDA"
  | "NEGOCIO"
  | "OUTROS";

export type GoalPriority = "LOW" | "MEDIUM" | "HIGH";
export type FinancialGoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "ARCHIVED";
export type GoalTransactionType = "DEPOSIT" | "WITHDRAW";
export type GoalPaceStatus = "ahead" | "on_track" | "behind";

interface FinancialGoalBase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  category: FinancialGoalCategory;
  priority: GoalPriority;
  targetAmount: number;
  initialAmount: number;
  currentAmount: number;
  startDate: string;
  targetDate: string;
  status: FinancialGoalStatus;
  linkedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalCardMetrics {
  progressPct: number;
  remainingAmount: number;
  exceededAmount: number;
  daysRemaining: number;
  isOverdue: boolean;
  monthlyRequiredAmount: number;
}

export interface GoalDetailMetrics extends GoalCardMetrics {
  weeklyRequiredAmount: number;
  dailyRequiredAmount: number;
  averageMonthlyContribution: number;
  projectedCompletionDate: string | null;
  paceStatus: GoalPaceStatus | null;
}

export interface LinkedInvestment {
  id: string;
  investmentId: string;
  name: string;
  currentValue: number;
}

export type FinancialGoal = FinancialGoalBase & GoalCardMetrics;

export type FinancialGoalDetail = FinancialGoalBase &
  GoalDetailMetrics & { linkedInvestments: LinkedInvestment[] };

export interface FinancialGoalsSummary {
  activeCount: number;
  completedCount: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgressPct: number;
}

export interface GoalTransaction {
  id: string;
  userId: string;
  goalId: string;
  type: GoalTransactionType;
  amount: number;
  transactionDate: string;
  sourceAccountId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialGoalInput {
  name: string;
  description?: string;
  category: FinancialGoalCategory;
  priority?: GoalPriority;
  targetAmount: number;
  initialAmount?: number;
  startDate: string;
  targetDate: string;
  linkedAccountId?: string;
}

export type UpdateFinancialGoalInput = Partial<CreateFinancialGoalInput> & {
  status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export interface CreateGoalTransactionInput {
  type: GoalTransactionType;
  amount: number;
  transactionDate: string;
  sourceAccountId?: string;
  description?: string;
}
