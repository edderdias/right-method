import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../../config/app-config.service";
import { AiProviderException } from "../../../common/exceptions/app.exception";
import { CERTO_IA_SYSTEM_PROMPT } from "../system-prompt";
import type { AiFinancialContext } from "../ai-context.service";
import type { AiCompletion, AiProviderAdapter, ChatHistoryEntry } from "./ai-provider.interface";

const RESPONSE_SCHEMA = {
  name: "certo_ia_reply",
  strict: true,
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      suggestedRoute: { type: ["string", "null"] },
      suggestedLabel: { type: ["string", "null"] },
    },
    required: ["reply", "suggestedRoute", "suggestedLabel"],
    additionalProperties: false,
  },
};

/** Thin fetch wrapper over the OpenAI Chat Completions API, mirroring the plain-fetch style of
 * PluggyClientService — no extra HTTP client dependency. */
@Injectable()
export class OpenAiProviderService implements AiProviderAdapter {
  private readonly logger = new Logger(OpenAiProviderService.name);

  constructor(private readonly config: AppConfigService) {}

  async complete(
    history: ChatHistoryEntry[],
    userMessage: string,
    context: AiFinancialContext,
    apiKey: string,
  ): Promise<AiCompletion> {
    const messages = [
      { role: "system" as const, content: CERTO_IA_SYSTEM_PROMPT },
      {
        role: "system" as const,
        content: `CONTEXTO FINANCEIRO (dados reais do usuário, JSON):\n${JSON.stringify(context)}`,
      },
      ...history.map((m) => ({
        role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    let response: Response;
    try {
      response = await fetch(`${this.config.get("OPENAI_BASE_URL")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.get("OPENAI_MODEL"),
          messages,
          response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
          temperature: 0.3,
        }),
      });
    } catch (error) {
      this.logger.error(`Falha de rede ao chamar a OpenAI: ${(error as Error).message}`);
      throw new AiProviderException();
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.logger.error(`OpenAI retornou ${response.status}: ${body}`);
      throw new AiProviderException();
    }

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") {
      this.logger.error("Resposta da OpenAI sem conteúdo utilizável.");
      throw new AiProviderException();
    }

    try {
      const parsed = JSON.parse(raw) as {
        reply: string;
        suggestedRoute: string | null;
        suggestedLabel: string | null;
      };
      return {
        content: parsed.reply,
        ...(parsed.suggestedRoute ? { suggestedRoute: parsed.suggestedRoute } : {}),
        ...(parsed.suggestedLabel ? { suggestedLabel: parsed.suggestedLabel } : {}),
      };
    } catch (error) {
      this.logger.error(
        `Falha ao interpretar resposta JSON da OpenAI: ${(error as Error).message}`,
      );
      throw new AiProviderException();
    }
  }
}
