-- AlterTable
ALTER TABLE "credit_card_invoices" ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3);
