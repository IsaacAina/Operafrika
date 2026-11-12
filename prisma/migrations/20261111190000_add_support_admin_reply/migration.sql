-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "adminRepliedAt" TIMESTAMP(3);
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "adminEmail" TEXT;

