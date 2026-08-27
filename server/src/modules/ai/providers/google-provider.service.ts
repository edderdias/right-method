import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../../config/app-config.service";
import { AiProviderException } from "../../../common/exceptions/app.exception";
import { CERTO_IA_SYSTEM_PROMPT } from "../system-prompt";
import type { AiFinancialContext } from "../ai-context.service";
import type { AiCompletion, AiProviderAdapter, ChatHistoryEntry } from "./ai-provider.interface";

/** Gemini's responseSchema is the OpenAPI 3.0 subset — the `type` field must be the uppercase
 * proto enum name ("OBJECT"/"STRING"), not the lowercase JSON Schema spelling, or the API 400s. */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    suggestedRoute: { type: "STRING", nullable: true },
    suggestedLabel: { type: "STRING", nullable: true },
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
      const message = (error as Error).message;
      this.logger.error(`Falha de rede ao chamar o Gemini: ${message}`);
      throw new AiProviderException(`Gemini (rede): ${message}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.logger.error(`Gemini retornou ${response.status}: ${body}`);
      throw new AiProviderException(`Gemini HTTP ${response.status}: ${body.slice(0, 600)}`);
    }

    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string") {
      this.logger.error(`Resposta do Gemini sem conteúdo utilizável: ${JSON.stringify(payload)}`);
      throw new AiProviderException(
        `Gemini sem conteúdo: ${JSON.stringify(payload).slice(0, 600)}`,
      );
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
      throw new AiProviderException(`Gemini JSON inválido: ${raw.slice(0, 300)}`);
    }
  }
}
