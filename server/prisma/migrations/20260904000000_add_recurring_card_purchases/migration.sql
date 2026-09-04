-- AlterTable
ALTER TABLE "credit_card_purchases"
  ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recurrenceEndDate" DATE,
  ADD COLUMN "parentPurchaseId" TEXT;

-- CreateIndex
CREATE INDEX "credit_card_purchases_isRecurring_idx" ON "credit_card_purchases"("isRecurring");

-- CreateIndex
CREATE INDEX "credit_card_purchases_parentPurchaseId_idx" ON "credit_card_purchases"("parentPurchaseId");

-- AddForeignKey
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_parentPurchaseId_fkey" FOREIGN KEY ("parentPurchaseId") REFERENCES "credit_card_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
