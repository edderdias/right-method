import { Injectable } from "@nestjs/common";
import { AiMessageRole, type AiMessage } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AppConfigService } from "../../config/app-config.service";
import { AiApiKeyMissingException } from "../../common/exceptions/app.exception";
import { UsersService } from "../users/users.service";
import { AiConversationsService } from "./ai-conversations.service";
import { AiContextService } from "./ai-context.service";
import { OpenAiProviderService, type ChatHistoryEntry } from "./openai-provider.service";

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
    private readonly provider: OpenAiProviderService,
    private readonly users: UsersService,
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

    const apiKey = (await this.users.getOpenAiApiKey(userId)) ?? this.config.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new AiApiKeyMissingException();
    }

    const financialContext = await this.context.buildContext(userId);
    const completion = await this.provider.complete(history, text, financialContext, apiKey);

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
