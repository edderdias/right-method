import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  FRONTEND_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().default(30),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().min(1),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .default("false"),

  PLUGGY_CLIENT_ID: z.string().min(1),
  PLUGGY_CLIENT_SECRET: z.string().min(1),
  PLUGGY_BASE_URL: z.string().url().default("https://api.pluggy.ai"),
  PLUGGY_WEBHOOK_SECRET: z.string().min(16),
  OPEN_FINANCE_INITIAL_SYNC_DAYS: z.coerce.number().default(365),
  /** Public base URL of this API (e.g. an ngrok URL in dev) used to register the Pluggy webhook.
   * Optional — without it, accounts still sync via the manual "Sincronizar agora" action. */
  API_PUBLIC_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${message}`);
  }
  return parsed.data;
}
