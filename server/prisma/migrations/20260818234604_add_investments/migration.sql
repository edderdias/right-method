-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('RENDA_FIXA', 'ACOES', 'FIIS', 'ETFS', 'TESOURO_DIRETO', 'FUNDOS', 'CRIPTOMOEDAS', 'PREVIDENCIA', 'POUPANCA', 'OUTROS');

-- CreateEnum
CREATE TYPE "InvestmentSource" AS ENUM ('MANUAL', 'OPEN_FINANCE');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InvestmentTransactionType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "InvestmentTransactionSource" AS ENUM ('MANUAL', 'OPEN_FINANCE');

-- CreateEnum
CREATE TYPE "InvestmentIncomeType" AS ENUM ('DIVIDENDO', 'JUROS', 'RENDIMENTO_FII', 'JCP', 'CUPOM', 'OUTROS');

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT,
    "externalInvestmentId" TEXT,
    "type" "InvestmentType" NOT NULL,
    "ticker" TEXT,
    "name" TEXT NOT NULL,
    "institutionName" TEXT,
    "quantity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "averagePrice" DECIMAL(12,2),
    "investedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentPrice" DECIMAL(12,2),
    "issuer" TEXT,
    "rate" TEXT,
    "indexer" TEXT,
    "maturityDate" DATE,
    "liquidity" TEXT,
    "source" "InvestmentSource" NOT NULL DEFAULT 'MANUAL',
    "status" "InvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "externalTransactionId" TEXT,
    "type" "InvestmentTransactionType" NOT NULL,
    "quantity" DECIMAL(18,8),
    "unitPrice" DECIMAL(12,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "transactionDate" DATE NOT NULL,
    "realizedGain" DECIMAL(12,2),
    "notes" TEXT,
    "source" "InvestmentTransactionSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_incomes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "type" "InvestmentIncomeType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investments_userId_idx" ON "investments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "investments_connectionId_externalInvestmentId_key" ON "investments"("connectionId", "externalInvestmentId");

-- CreateIndex
CREATE INDEX "investment_transactions_userId_idx" ON "investment_transactions"("userId");

-- CreateIndex
CREATE INDEX "investment_transactions_investmentId_idx" ON "investment_transactions"("investmentId");

-- CreateIndex
CREATE UNIQUE INDEX "investment_transactions_investmentId_externalTransactionId_key" ON "investment_transactions"("investmentId", "externalTransactionId");

-- CreateIndex
CREATE INDEX "investment_incomes_userId_idx" ON "investment_incomes"("userId");

-- CreateIndex
CREATE INDEX "investment_incomes_investmentId_idx" ON "investment_incomes"("investmentId");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "open_finance_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_incomes" ADD CONSTRAINT "investment_incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_incomes" ADD CONSTRAINT "investment_incomes_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
