export type InvestmentType =
  | "RENDA_FIXA"
  | "ACOES"
  | "FIIS"
  | "ETFS"
  | "TESOURO_DIRETO"
  | "FUNDOS"
  | "CRIPTOMOEDAS"
  | "PREVIDENCIA"
  | "POUPANCA"
  | "OUTROS";

export type InvestmentSource = "MANUAL" | "OPEN_FINANCE";
export type InvestmentStatus = "ACTIVE" | "ARCHIVED";
export type InvestmentTransactionType =
  "BUY" | "SELL" | "DIVIDEND" | "INTEREST" | "DEPOSIT" | "WITHDRAW";
export type InvestmentIncomeType =
  "DIVIDENDO" | "JUROS" | "RENDIMENTO_FII" | "JCP" | "CUPOM" | "OUTROS";

export interface Investment {
  id: string;
  connectionId: string | null;
  externalInvestmentId: string | null;
  type: InvestmentType;
  ticker: string | null;
  name: string;
  institutionName: string | null;
  quantity: number;
  averagePrice: number | null;
  investedAmount: number;
  currentValue: number;
  currentPrice: number | null;
  issuer: string | null;
  rate: string | null;
  indexer: string | null;
  maturityDate: string | null;
  liquidity: string | null;
  source: InvestmentSource;
  status: InvestmentStatus;
  lastSyncAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentSummaryByType {
  type: InvestmentType;
  investedAmount: number;
  currentValue: number;
}

export interface InvestmentSummary {
  investmentCount: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  totalIncome: number;
  byType: InvestmentSummaryByType[];
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  externalTransactionId: string | null;
  type: InvestmentTransactionType;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
  fees: number;
  transactionDate: string;
  realizedGain: number | null;
  notes: string | null;
  source: InvestmentSource;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentIncome {
  id: string;
  investmentId: string;
  type: InvestmentIncomeType;
  amount: number;
  paymentDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestmentInput {
  type: InvestmentType;
  ticker?: string;
  name: string;
  institutionName?: string;
  quantity?: number;
  averagePrice?: number;
  investedAmount?: number;
  currentValue?: number;
  currentPrice?: number;
  issuer?: string;
  rate?: string;
  indexer?: string;
  maturityDate?: string;
  liquidity?: string;
  notes?: string;
}

export type UpdateInvestmentInput = Partial<CreateInvestmentInput>;

export interface CreateInvestmentTransactionInput {
  type: InvestmentTransactionType;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  fees?: number;
  transactionDate: string;
  notes?: string;
}

export interface CreateInvestmentIncomeInput {
  type: InvestmentIncomeType;
  amount: number;
  paymentDate: string;
  notes?: string;
}
