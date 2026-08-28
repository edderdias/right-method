-- ============================================================================
-- Catch-up manual do banco de PRODUÇÃO — Método Certo
-- ----------------------------------------------------------------------------
-- Conserta a migration que ficou FAILED em prod (P3009,
-- 20260825172924_add_pluggy_user_credentials) e aplica as 6 seguintes que
-- faltam (o que causa "column users.hideBalances does not exist" no login).
--
-- Tudo é idempotente (IF NOT EXISTS / guards), seguro de rodar mesmo com o
-- banco parcialmente migrado. Registra tudo no histórico do Prisma com o
-- checksum correto — depois disso `prisma migrate deploy` fica limpo.
--
-- Onde rodar (qualquer um):
--   a) Railway → serviço Postgres → aba "Data"/Query → cola este arquivo → Run
--   b) npx prisma db execute --file scripts/prod-catchup.sql --schema prisma/schema.prisma
--   c) psql "$DATABASE_URL" -f scripts/prod-catchup.sql
-- Depois: npx prisma migrate deploy   (deve dizer "No pending migrations to apply")
--
-- Sem BEGIN/COMMIT de propósito (compatível com `prisma db execute`). Cada bloco
-- é guardado, então rodar de novo após uma falha parcial é seguro.
--
-- DIAGNÓSTICO (opcional, rode antes):
--   SELECT migration_name, finished_at, rolled_back_at
--   FROM "_prisma_migrations" ORDER BY started_at;
-- ============================================================================

-- 20260825172924_add_pluggy_user_credentials -------------------------------
-- Esta é a migration que ficou FAILED em prod (P3009), provavelmente porque as
-- colunas já existiam. Garante as colunas e conserta o registro no histórico.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pluggyClientId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pluggyClientSecretEncrypted" TEXT;

UPDATE "_prisma_migrations"
SET finished_at = now(), rolled_back_at = NULL, applied_steps_count = 1, logs = NULL
WHERE migration_name = '20260825172924_add_pluggy_user_credentials'
  AND finished_at IS NULL;

INSERT INTO "_prisma_migrations"
  (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
SELECT gen_random_uuid(),
       '9e68ae2d7959e4e94534da96168d4b824e4970d2869a7bcb4226c35b1d47a924',
       '20260825172924_add_pluggy_user_credentials', now(), now(), 1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" m
  WHERE m.migration_name = '20260825172924_add_pluggy_user_credentials'
);

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
