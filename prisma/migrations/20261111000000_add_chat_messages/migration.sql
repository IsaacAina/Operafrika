-- CreateTable
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "label" TEXT,
    "dataSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId");
CREATE INDEX IF NOT EXISTS "ChatMessage_businessId_idx" ON "ChatMessage"("businessId");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- Enable Row Level Security
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "chat_message_system_all" ON "ChatMessage";
CREATE POLICY "chat_message_system_all" ON "ChatMessage"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

DROP POLICY IF EXISTS "chat_message_self_select" ON "ChatMessage";
CREATE POLICY "chat_message_self_select" ON "ChatMessage"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS "chat_message_self_insert" ON "ChatMessage";
CREATE POLICY "chat_message_self_insert" ON "ChatMessage"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.user_id', true));

