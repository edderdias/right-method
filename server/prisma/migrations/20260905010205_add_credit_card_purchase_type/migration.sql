-- CreateEnum
CREATE TYPE "CardPurchaseType" AS ENUM ('PURCHASE', 'CREDIT');

-- AlterTable
ALTER TABLE "credit_card_purchases" ADD COLUMN     "type" "CardPurchaseType" NOT NULL DEFAULT 'PURCHASE';
