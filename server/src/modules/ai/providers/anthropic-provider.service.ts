import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../../config/app-config.service";
import { AiProviderException } from "../../../common/exceptions/app.exception";
import { CERTO_IA_SYSTEM_PROMPT } from "../system-prompt";
import type { AiFinancialContext } from "../ai-context.service";
import type { AiCompletion, AiProviderAdapter, ChatHistoryEntry } from "./ai-provider.interface";

const REPLY_TOOL_NAME = "certo_ia_reply";

const REPLY_TOOL = {
  name: REPLY_TOOL_NAME,
  description: "Envia a resposta estruturada do Certo IA para o usuário.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      suggestedRoute: { type: ["string", "null"] },
      suggestedLabel: { type: ["string", "null"] },
    },
    required: ["reply", "suggestedRoute", "suggestedLabel"],
  },
};

/** Thin fetch wrapper over Anthropic's Messages API. Structured output has no direct equivalent
 * to OpenAI's json_schema mode, so we force a single tool call and read its input as the reply. */
@Injectable()
export class AnthropicProviderService implements AiProviderAdapter {
  private readonly logger = new Logger(AnthropicProviderService.name);

  constructor(private readonly config: AppConfigService) {}

  async complete(
    history: ChatHistoryEntry[],
    userMessage: string,
    context: AiFinancialContext,
    apiKey: string,
  ): Promise<AiCompletion> {
    const system = `${CERTO_IA_SYSTEM_PROMPT}\n\nCONTEXTO FINANCEIRO (dados reais do usuário, JSON):\n${JSON.stringify(context)}`;
    const messages = [
      ...history.map((m) => ({
        role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    let response: Response;
    try {
      response = await fetch(`${this.config.get("ANTHROPIC_BASE_URL")}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.get("ANTHROPIC_MODEL"),
          max_tokens: 1024,
          system,
          messages,
          tools: [REPLY_TOOL],
          tool_choice: { type: "tool", name: REPLY_TOOL_NAME },
        }),
      });
    } catch (error) {
      this.logger.error(`Falha de rede ao chamar a Anthropic: ${(error as Error).message}`);
      throw new AiProviderException();
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.logger.error(`Anthropic retornou ${response.status}: ${body}`);
      throw new AiProviderException();
    }

    const payload = await response.json();
    const blocks = Array.isArray(payload?.content) ? payload.content : [];
    const toolUse = blocks.find(
      (block: { type?: string; name?: string }) =>
        block?.type === "tool_use" && block?.name === REPLY_TOOL_NAME,
    ) as { input?: { reply?: string; suggestedRoute?: string | null; suggestedLabel?: string | null } } | undefined;

    if (!toolUse?.input || typeof toolUse.input.reply !== "string") {
      this.logger.error("Resposta da Anthropic sem tool_use utilizável.");
      throw new AiProviderException();
    }

    return {
      content: toolUse.input.reply,
      ...(toolUse.input.suggestedRoute ? { suggestedRoute: toolUse.input.suggestedRoute } : {}),
      ...(toolUse.input.suggestedLabel ? { suggestedLabel: toolUse.input.suggestedLabel } : {}),
    };
  }
}
