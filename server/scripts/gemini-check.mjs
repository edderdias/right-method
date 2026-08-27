// Diagnóstico do modo gratuito (Gemini). Uso:
//   GOOGLE_API_KEY=xxx node scripts/gemini-check.mjs
//   GOOGLE_API_KEY=xxx GOOGLE_MODEL=gemini-2.5-flash node scripts/gemini-check.mjs
// Replica exatamente a chamada feita por GoogleProviderService e imprime status + corpo cru.

const apiKey = process.env.GOOGLE_API_KEY;
const model = process.env.GOOGLE_MODEL ?? "gemini-3.6-flash";
const baseUrl =
  process.env.GOOGLE_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";

if (!apiKey) {
  console.error("Defina GOOGLE_API_KEY no ambiente antes de rodar.");
  process.exit(1);
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    suggestedRoute: { type: "STRING", nullable: true },
    suggestedLabel: { type: "STRING", nullable: true },
  },
  required: ["reply"],
};

const url = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

const body = {
  systemInstruction: { parts: [{ text: "Você é um assistente de teste. Responda em JSON." }] },
  contents: [{ role: "user", parts: [{ text: "Diga apenas: funcionou." }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.3,
  },
};

console.log(`POST ${baseUrl}/models/${model}:generateContent  (key ...${apiKey.slice(-4)})`);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`\nHTTP ${res.status} ${res.statusText}\n`);
console.log(text);
