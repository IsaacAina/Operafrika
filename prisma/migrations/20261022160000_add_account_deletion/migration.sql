-- Account deletion: soft delete markers, the grace period deadline, and the
-- relations that decide what survives a person's account being purged.
--
-- Business records (audit log, payroll) keep their history and drop only the
-- reference to the person. Personal rows (sessions, branch access, support
-- messages, verification codes, reset tokens) go with the account.

ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETION_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETION_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETION_PURGED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionCancelTokenExpires" TIMESTAMP(3),
ADD COLUMN     "deletionCancelTokenHash" TEXT,
ADD COLUMN     "deletionScheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionScheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorEmail" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PayrollEntry" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportMessage" ALTER COLUMN "userId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "BranchAccess" DROP CONSTRAINT "BranchAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollEntry" DROP CONSTRAINT "PayrollEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "SupportMessage" DROP CONSTRAINT "SupportMessage_userId_fkey";

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Business_deletedAt_idx" ON "Business"("deletedAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "BranchAccess" ADD CONSTRAINT "BranchAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PasswordResetToken_token_key" RENAME TO "PasswordResetToken_tokenHash_key";
