import type { InvestmentType } from "@prisma/client";

/**
 * Seam for a future market-data integration (e.g. a Pluggy/B3/exchange-backed quote provider).
 * Not implemented and not wired into the module's providers — `Investment.currentPrice` is only
 * ever set by manual user input for now. When a real provider exists, register an implementation
 * of this interface and have InvestmentsService call it to refresh currentPrice/currentValue.
 */
export interface MarketDataProvider {
  getQuote(ticker: string, type: InvestmentType): Promise<{ price: number; asOf: Date } | null>;
}
