import type {
  InvestmentIncomeType,
  InvestmentTransactionType,
  InvestmentType,
} from "@/types/investment";

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  RENDA_FIXA: "Renda Fixa",
  ACOES: "Ações",
  FIIS: "Fundos Imobiliários (FIIs)",
  ETFS: "ETFs",
  TESOURO_DIRETO: "Tesouro Direto",
  FUNDOS: "Fundos de Investimento",
  CRIPTOMOEDAS: "Criptomoedas",
  PREVIDENCIA: "Previdência",
  POUPANCA: "Poupança",
  OUTROS: "Outros",
};

export const INVESTMENT_TYPE_OPTIONS = Object.entries(INVESTMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as InvestmentType, label }),
);

/** Types that carry the fixed-income-specific fields (issuer, rate, indexer, maturity, liquidity). */
export function isFixedIncomeType(type: InvestmentType): boolean {
  return type === "RENDA_FIXA" || type === "TESOURO_DIRETO";
}

export const INVESTMENT_INCOME_TYPE_LABELS: Record<InvestmentIncomeType, string> = {
  DIVIDENDO: "Dividendo",
  JUROS: "Juros",
  RENDIMENTO_FII: "Rendimento de FII",
  JCP: "JCP",
  CUPOM: "Cupom",
  OUTROS: "Outros",
};

export const INVESTMENT_INCOME_TYPE_OPTIONS = Object.entries(INVESTMENT_INCOME_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as InvestmentIncomeType, label }),
);

export const INVESTMENT_TRANSACTION_TYPE_LABELS: Record<InvestmentTransactionType, string> = {
  BUY: "Compra",
  SELL: "Venda",
  DEPOSIT: "Aporte",
  WITHDRAW: "Resgate",
  DIVIDEND: "Dividendo",
  INTEREST: "Juros",
};
