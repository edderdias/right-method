-- AlterTable
ALTER TABLE "credit_card_invoices" ADD COLUMN     "paidExpenseId" TEXT;

-- CreateTable
CREATE TABLE "account_transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transferDate" DATE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_transfers_userId_idx" ON "account_transfers"("userId");

-- CreateIndex
CREATE INDEX "account_transfers_fromAccountId_idx" ON "account_transfers"("fromAccountId");

-- CreateIndex
CREATE INDEX "account_transfers_toAccountId_idx" ON "account_transfers"("toAccountId");

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed global expense category used when a credit-card invoice payment is booked as an expense
INSERT INTO "categories" ("id", "userId", "name", "type", "createdAt")
SELECT 'c0000000-0000-4000-8000-00000000ca7d', NULL, 'Cartão de crédito', 'EXPENSE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "categories" WHERE "userId" IS NULL AND "name" = 'Cartão de crédito' AND "type" = 'EXPENSE'
);
