import { Injectable } from "@nestjs/common";
import { AiMessageRole, AiProvider, type AiMessage } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AppConfigService } from "../../config/app-config.service";
import { AiApiKeyMissingException } from "../../common/exceptions/app.exception";
import { UsersService } from "../users/users.service";
import { AiConversationsService } from "./ai-conversations.service";
import { AiContextService } from "./ai-context.service";
import { AiFreeTierLimiterService } from "./ai-free-tier-limiter.service";
import { AiProviderRegistry } from "./providers/ai-provider-registry.service";
import type { ChatHistoryEntry } from "./providers/ai-provider.interface";

const HISTORY_LIMIT = 20;
const AUTO_TITLE_LENGTH = 60;

export interface SendMessageResult {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
}

@Injectable()
export class AiChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly conversations: AiConversationsService,
    private readonly context: AiContextService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly users: UsersService,
    private readonly freeTierLimiter: AiFreeTierLimiterService,
  ) {}

  async sendMessage(
    userId: string,
    conversationId: string,
    text: string,
  ): Promise<SendMessageResult> {
    const conversation = await this.conversations.assertOwnership(userId, conversationId);

    const priorMessages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    const history: ChatHistoryEntry[] = priorMessages
      .slice()
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    const credentials = await this.users.getAiCredentials(userId);
    let provider: AiProvider;
    let apiKey: string;
    let usingSharedKey = false;

    if (credentials) {
      provider = credentials.provider;
      apiKey = credentials.apiKey;
    } else {
      const googleKey = this.config.get("GOOGLE_API_KEY");
      const openaiKey = this.config.get("OPENAI_API_KEY");
      if (googleKey) {
        provider = AiProvider.GOOGLE;
        apiKey = googleKey;
      } else if (openaiKey) {
        provider = AiProvider.OPENAI;
        apiKey = openaiKey;
      } else {
        throw new AiApiKeyMissingException();
      }
      usingSharedKey = true;
    }

    if (usingSharedKey) {
      await this.freeTierLimiter.assertWithinLimit(userId);
    }

    const financialContext = await this.context.buildContext(userId);
    const completion = await this.providerRegistry.complete(
      provider,
      history,
      text,
      financialContext,
      apiKey,
    );

    if (usingSharedKey) {
      await this.freeTierLimiter.registerUse(userId);
    }

    const [userMessage, assistantMessage] = await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: { conversationId, role: AiMessageRole.USER, content: text },
      }),
      this.prisma.aiMessage.create({
        data: {
          conversationId,
          role: AiMessageRole.ASSISTANT,
          content: completion.content,
          suggestedRoute: completion.suggestedRoute,
          suggestedLabel: completion.suggestedLabel,
        },
      }),
    ]);

    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(conversation.title === "Nova conversa" ? { title: this.deriveTitle(text) } : {}),
      },
    });

    return { userMessage, assistantMessage };
  }

  private deriveTitle(text: string): string {
    const trimmed = text.trim();
    return trimmed.length > AUTO_TITLE_LENGTH
      ? `${trimmed.slice(0, AUTO_TITLE_LENGTH).trimEnd()}…`
      : trimmed;
  }
}
