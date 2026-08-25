-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE');

-- RenameColumn (preserves existing encrypted keys instead of dropping them)
ALTER TABLE "users" RENAME COLUMN "openAiApiKeyEncrypted" TO "aiApiKeyEncrypted";

-- AddColumn
ALTER TABLE "users" ADD COLUMN "aiProvider" "AiProvider" NOT NULL DEFAULT 'OPENAI';
