-- AlterEnum
ALTER TYPE "AuditEvent" ADD VALUE 'OPEN_FINANCE_CONNECTION_CREATED';
ALTER TYPE "AuditEvent" ADD VALUE 'OPEN_FINANCE_ACCOUNT_ADDED';
ALTER TYPE "AuditEvent" ADD VALUE 'OPEN_FINANCE_ACCOUNT_DISCONNECTED';
ALTER TYPE "AuditEvent" ADD VALUE 'OPEN_FINANCE_SYNC_COMPLETED';
ALTER TYPE "AuditEvent" ADD VALUE 'OPEN_FINANCE_SYNC_FAILED';
ALTER TYPE "AuditEvent" ADD VALUE 'OPEN_FINANCE_WEBHOOK_RECEIVED';

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'SYNCING', 'REQUIRES_REAUTH', 'EXPIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'OPEN_FINANCE', 'CARD');

-- CreateTable
CREATE TABLE "open_finance_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PLUGGY',
    "providerItemId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "institutionImageUrl" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'SYNCING',
    "statusDetail" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_finance_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountSubtype" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketingName" TEXT,
    "numberMasked" TEXT,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "status" "ConnectionStatus" NOT NULL DEFAULT 'SYNCING',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalTransactionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "merchantName" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "BankTransactionType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "transactionDate" DATE NOT NULL,
    "categoryId" TEXT,
    "notes" TEXT,
    "source" "TransactionSource" NOT NULL DEFAULT 'OPEN_FINANCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "open_finance_connections_providerItemId_key" ON "open_finance_connections"("providerItemId");

-- CreateIndex
CREATE INDEX "open_finance_connections_userId_idx" ON "open_finance_connections"("userId");

-- CreateIndex
CREATE INDEX "connected_accounts_userId_idx" ON "connected_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_connectionId_externalAccountId_key" ON "connected_accounts"("connectionId", "externalAccountId");

-- CreateIndex
CREATE INDEX "bank_transactions_userId_idx" ON "bank_transactions"("userId");

-- CreateIndex
CREATE INDEX "bank_transactions_accountId_transactionDate_idx" ON "bank_transactions"("accountId", "transactionDate");

-- CreateIndex
CREATE INDEX "bank_transactions_categoryId_idx" ON "bank_transactions"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_accountId_externalTransactionId_key" ON "bank_transactions"("accountId", "externalTransactionId");

-- AddForeignKey
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "open_finance_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "connected_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
