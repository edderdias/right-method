-- AlterTable
ALTER TABLE "credit_card_purchases" ADD COLUMN     "responsibleName" TEXT;

-- CreateIndex
CREATE INDEX "credit_card_purchases_cardId_responsibleName_idx" ON "credit_card_purchases"("cardId", "responsibleName");
