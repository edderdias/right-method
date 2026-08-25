import { Module } from "@nestjs/common";
import { ReportsModule } from "../reports/reports.module";
import { FinancialGoalsModule } from "../financial-goals/financial-goals.module";
import { InvestmentsModule } from "../investments/investments.module";
import { CreditCardsModule } from "../credit-cards/credit-cards.module";
import { UsersModule } from "../users/users.module";
import { AiController } from "./ai.controller";
import { AiConversationsService } from "./ai-conversations.service";
import { AiChatService } from "./ai-chat.service";
import { AiContextService } from "./ai-context.service";
import { AiProviderRegistry } from "./providers/ai-provider-registry.service";
import { AnthropicProviderService } from "./providers/anthropic-provider.service";
import { GoogleProviderService } from "./providers/google-provider.service";
import { OpenAiProviderService } from "./providers/openai-provider.service";

@Module({
  imports: [ReportsModule, FinancialGoalsModule, InvestmentsModule, CreditCardsModule, UsersModule],
  controllers: [AiController],
  providers: [
    AiConversationsService,
    AiChatService,
    AiContextService,
    AiProviderRegistry,
    OpenAiProviderService,
    AnthropicProviderService,
    GoogleProviderService,
  ],
})
export class AiModule {}
