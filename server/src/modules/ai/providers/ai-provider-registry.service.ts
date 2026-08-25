import { Injectable } from "@nestjs/common";
import { AiProvider } from "@prisma/client";
import type { AiFinancialContext } from "../ai-context.service";
import { AnthropicProviderService } from "./anthropic-provider.service";
import { GoogleProviderService } from "./google-provider.service";
import { OpenAiProviderService } from "./openai-provider.service";
import type { AiCompletion, ChatHistoryEntry } from "./ai-provider.interface";

@Injectable()
export class AiProviderRegistry {
  constructor(
    private readonly openai: OpenAiProviderService,
    private readonly anthropic: AnthropicProviderService,
    private readonly google: GoogleProviderService,
  ) {}

  complete(
    provider: AiProvider,
    history: ChatHistoryEntry[],
    userMessage: string,
    context: AiFinancialContext,
    apiKey: string,
  ): Promise<AiCompletion> {
    const adapter = {
      OPENAI: this.openai,
      ANTHROPIC: this.anthropic,
      GOOGLE: this.google,
    }[provider];
    return adapter.complete(history, userMessage, context, apiKey);
  }
}
