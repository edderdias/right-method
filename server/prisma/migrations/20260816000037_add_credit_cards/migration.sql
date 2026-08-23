-- CreateEnum
CREATE TYPE "CreditCardSource" AS ENUM ('MANUAL', 'OPEN_FINANCE');

-- CreateEnum
CREATE TYPE "CreditCardStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CreditCardInvoiceStatus" AS ENUM ('OPEN', 'CLOSED', 'DUE', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CardPurchaseSource" AS ENUM ('MANUAL', 'OPEN_FINANCE');

-- CreateTable
CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT,
    "externalCardId" TEXT,
    "institutionName" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "lastFourDigits" TEXT,
    "creditLimit" DECIMAL(12,2),
    "availableLimit" DECIMAL(12,2),
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "source" "CreditCardSource" NOT NULL DEFAULT 'MANUAL',
    "status" "CreditCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_card_invoices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "closingDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "CreditCardInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "paidAt" TIMESTAMP(3),
    "paidFromAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_card_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_card_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "externalTransactionId" TEXT,
    "description" TEXT NOT NULL,
    "merchantName" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "categoryId" TEXT,
    "source" "CardPurchaseSource" NOT NULL DEFAULT 'MANUAL',
    "installmentGroupId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_card_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_cards_userId_idx" ON "credit_cards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_cards_connectionId_externalCardId_key" ON "credit_cards"("connectionId", "externalCardId");

-- CreateIndex
CREATE INDEX "credit_card_invoices_userId_idx" ON "credit_card_invoices"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_invoices_cardId_referenceMonth_key" ON "credit_card_invoices"("cardId", "referenceMonth");

-- CreateIndex
CREATE INDEX "credit_card_purchases_userId_idx" ON "credit_card_purchases"("userId");

-- CreateIndex
CREATE INDEX "credit_card_purchases_invoiceId_idx" ON "credit_card_purchases"("invoiceId");

-- CreateIndex
CREATE INDEX "credit_card_purchases_installmentGroupId_idx" ON "credit_card_purchases"("installmentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_purchases_cardId_externalTransactionId_key" ON "credit_card_purchases"("cardId", "externalTransactionId");

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "open_finance_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_invoices" ADD CONSTRAINT "credit_card_invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_invoices" ADD CONSTRAINT "credit_card_invoices_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "credit_card_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
