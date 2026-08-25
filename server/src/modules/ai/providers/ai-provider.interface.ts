import type { AiFinancialContext } from "../ai-context.service";

export interface ChatHistoryEntry {
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface AiCompletion {
  content: string;
  suggestedRoute?: string;
  suggestedLabel?: string;
}

export interface AiProviderAdapter {
  complete(
    history: ChatHistoryEntry[],
    userMessage: string,
    context: AiFinancialContext,
    apiKey: string,
  ): Promise<AiCompletion>;
}
