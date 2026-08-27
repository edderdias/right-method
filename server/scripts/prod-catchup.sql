-- ============================================================================
-- Catch-up manual do banco de PRODUÇÃO — Método Certo
-- ----------------------------------------------------------------------------
-- Aplica as 6 migrations que faltam em produção (o que causa
-- "column users.hideBalances does not exist" no login).
--
-- PREFIRA `npx prisma migrate deploy` — este script é só para desbloquear
-- rápido quando não há acesso à CLI no ambiente de produção.
--
-- Tudo aqui é idempotente (IF NOT EXISTS / guards), então é seguro rodar
-- mesmo que o banco já tenha parte das mudanças.
--
-- 1) Rode o diagnóstico abaixo. Se a última migration NÃO for
--    20260823005918_add_user_settings_and_family_sharing, PARE e use a CLI
--    (`npx prisma migrate deploy`) — este script cobre só as 6 seguintes.
-- 2) Rode este script inteiro:  psql "$DATABASE_URL" -f scripts/prod-catchup.sql
--
-- O bloco final registra as migrations no histórico do Prisma com o checksum
-- correto, então o `migrate deploy` dos próximos deploys reconhece tudo como
-- aplicado e não tenta reaplicar. (Validado: `prisma migrate status` fica limpo.)
-- ============================================================================

-- DIAGNÓSTICO (rode isolado antes):
--   SELECT migration_name, finished_at
--   FROM "_prisma_migrations" ORDER BY started_at;

BEGIN;

-- 20260825182148_add_ai_provider_selection -----------------------------------
DO $$ BEGIN
  CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'openAiApiKeyEncrypted'
     )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'aiApiKeyEncrypted'
     )
  THEN
    ALTER TABLE "users" RENAME COLUMN "openAiApiKeyEncrypted" TO "aiApiKeyEncrypted";
  END IF;
END $$;

-- caso a coluna nunca tenha existido (migration 20260823004121 também ausente)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiApiKeyEncrypted" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiProvider" "AiProvider" NOT NULL DEFAULT 'OPENAI';

-- 20260825234400_add_hide_balances -----------------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hideBalances" BOOLEAN NOT NULL DEFAULT false;

-- 20260826000940_add_notifications ---------------------------------------
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'BILL_DUE', 'CARD_INVOICE_CLOSING', 'CARD_INVOICE_DUE', 'GOAL_MILESTONE',
    'LOW_BALANCE', 'INVESTMENT_INCOME', 'INVESTMENT_MATURITY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "entityId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_userId_type_entityId_key" ON "notifications"("userId", "type", "entityId");
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 20260826003005_add_two_factor_secret ---------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecretEncrypted" TEXT;

-- 20260826005900_add_webauthn_credentials ----------------------------
CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "webauthn_credentials_credentialId_key" ON "webauthn_credentials"("credentialId");
CREATE INDEX IF NOT EXISTS "webauthn_credentials_userId_idx" ON "webauthn_credentials"("userId");
DO $$ BEGIN
  ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 20260826120000_add_purchase_responsible ---------------------------
ALTER TABLE "credit_card_purchases" ADD COLUMN IF NOT EXISTS "responsibleName" TEXT;
CREATE INDEX IF NOT EXISTS "credit_card_purchases_cardId_responsibleName_idx"
  ON "credit_card_purchases"("cardId", "responsibleName");

-- Histórico do Prisma: marca as migrations como aplicadas -------------------
-- (checksums reais dos arquivos em prisma/migrations/*/migration.sql)
INSERT INTO "_prisma_migrations"
  (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
SELECT gen_random_uuid(), v.checksum, v.name, now(), now(), 1
FROM (VALUES
  ('20260825182148_add_ai_provider_selection',  '71c66e8f6255bf86689f0e53489e85a7b41e14f046a46f42a116c5030b0c292b'),
  ('20260825234400_add_hide_balances',          '556cfee30970bd38d8c1305c3851047a2f1ab8addb15ecb64e040e96be315493'),
  ('20260826000940_add_notifications',          '2239764e5ebd11296d90618e64ef754dfedf7d801b8d7c13165c28a15772897d'),
  ('20260826003005_add_two_factor_secret',      '2d256740a9dff081e3db9601978adcffd502f4728d3baad43598da8ceab85986'),
  ('20260826005900_add_webauthn_credentials',   'c26a17dcf43a2ae93b4590b4eae61c7ee2f02e4fb7897da6008ed345976b05aa'),
  ('20260826120000_add_purchase_responsible',   '102b17ea12168d3ada2d251ad60d343aceb4e1ba0e90c3fd60893929a8ad0477')
) AS v(name, checksum)
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" m WHERE m.migration_name = v.name
);

COMMIT;
