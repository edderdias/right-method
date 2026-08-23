-- CreateEnum
CREATE TYPE "FinancialGoalCategory" AS ENUM ('RESERVA_EMERGENCIA', 'VIAGEM', 'CASA', 'CARRO', 'EDUCACAO', 'APOSENTADORIA', 'INVESTIMENTO', 'COMPRA', 'DIVIDA', 'NEGOCIO', 'OUTROS');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FinancialGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GoalTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "FinancialGoalCategory" NOT NULL,
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "initialAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "targetDate" DATE NOT NULL,
    "status" "FinancialGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" "GoalTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionDate" DATE NOT NULL,
    "sourceAccountId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_investment_links" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_investment_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_goals_userId_idx" ON "financial_goals"("userId");

-- CreateIndex
CREATE INDEX "financial_goals_userId_status_idx" ON "financial_goals"("userId", "status");

-- CreateIndex
CREATE INDEX "goal_transactions_userId_idx" ON "goal_transactions"("userId");

-- CreateIndex
CREATE INDEX "goal_transactions_goalId_idx" ON "goal_transactions"("goalId");

-- CreateIndex
CREATE INDEX "goal_investment_links_goalId_idx" ON "goal_investment_links"("goalId");

-- CreateIndex
CREATE INDEX "goal_investment_links_investmentId_idx" ON "goal_investment_links"("investmentId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_investment_links_goalId_investmentId_key" ON "goal_investment_links"("goalId", "investmentId");

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_transactions" ADD CONSTRAINT "goal_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_transactions" ADD CONSTRAINT "goal_transactions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "financial_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_transactions" ADD CONSTRAINT "goal_transactions_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_investment_links" ADD CONSTRAINT "goal_investment_links_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "financial_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_investment_links" ADD CONSTRAINT "goal_investment_links_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
