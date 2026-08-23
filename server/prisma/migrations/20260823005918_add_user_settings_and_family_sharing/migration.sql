-- CreateEnum
CREATE TYPE "FamilyInviteStatus" AS ENUM ('PENDING', 'REDEEMED', 'REVOKED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEvent" ADD VALUE 'FAMILY_INVITE_CREATED';
ALTER TYPE "AuditEvent" ADD VALUE 'FAMILY_INVITE_REDEEMED';
ALTER TYPE "AuditEvent" ADD VALUE 'FAMILY_ACCESS_REVOKED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN     "newDeviceAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyBillDue" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyCardInvoice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyGoalProgress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyInvestment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyLowBalance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "family_invites" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "FamilyInviteStatus" NOT NULL DEFAULT 'PENDING',
    "redeemedById" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_access_grants" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "family_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_invites_code_key" ON "family_invites"("code");

-- CreateIndex
CREATE INDEX "family_invites_inviterId_idx" ON "family_invites"("inviterId");

-- CreateIndex
CREATE INDEX "family_access_grants_ownerId_idx" ON "family_access_grants"("ownerId");

-- CreateIndex
CREATE INDEX "family_access_grants_memberId_idx" ON "family_access_grants"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "family_access_grants_ownerId_memberId_key" ON "family_access_grants"("ownerId", "memberId");

-- AddForeignKey
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_access_grants" ADD CONSTRAINT "family_access_grants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_access_grants" ADD CONSTRAINT "family_access_grants_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
