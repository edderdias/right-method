import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../../config/app-config.service";
import { AiProviderException } from "../../../common/exceptions/app.exception";
import { CERTO_IA_SYSTEM_PROMPT } from "../system-prompt";
import type { AiFinancialContext } from "../ai-context.service";
import type { AiCompletion, AiProviderAdapter, ChatHistoryEntry } from "./ai-provider.interface";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    suggestedRoute: { type: "string", nullable: true },
    suggestedLabel: { type: "string", nullable: true },
  },
  required: ["reply"],
};

/** Thin fetch wrapper over Google's Gemini generateContent API. Uses responseSchema for
 * structured JSON output, Gemini's equivalent of OpenAI's json_schema mode. */
@Injectable()
export class GoogleProviderService implements AiProviderAdapter {
  private readonly logger = new Logger(GoogleProviderService.name);

  constructor(private readonly config: AppConfigService) {}

  async complete(
    history: ChatHistoryEntry[],
    userMessage: string,
    context: AiFinancialContext,
    apiKey: string,
  ): Promise<AiCompletion> {
    const contents = [
      ...history.map((m) => ({
        role: m.role === "USER" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const model = this.config.get("GOOGLE_MODEL");
    const url = `${this.config.get("GOOGLE_BASE_URL")}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `${CERTO_IA_SYSTEM_PROMPT}\n\nCONTEXTO FINANCEIRO (dados reais do usuário, JSON):\n${JSON.stringify(context)}`,
              },
            ],
          },
          contents,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.3,
          },
        }),
      });
    } catch (error) {
      this.logger.error(`Falha de rede ao chamar o Gemini: ${(error as Error).message}`);
      throw new AiProviderException();
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.logger.error(`Gemini retornou ${response.status}: ${body}`);
      throw new AiProviderException();
    }

    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string") {
      this.logger.error("Resposta do Gemini sem conteúdo utilizável.");
      throw new AiProviderException();
    }

    try {
      const parsed = JSON.parse(raw) as {
        reply: string;
        suggestedRoute?: string | null;
        suggestedLabel?: string | null;
      };
      return {
        content: parsed.reply,
        ...(parsed.suggestedRoute ? { suggestedRoute: parsed.suggestedRoute } : {}),
        ...(parsed.suggestedLabel ? { suggestedLabel: parsed.suggestedLabel } : {}),
      };
    } catch (error) {
      this.logger.error(`Falha ao interpretar resposta JSON do Gemini: ${(error as Error).message}`);
      throw new AiProviderException();
    }
  }
}
