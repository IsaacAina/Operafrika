require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  console.log('Creating ChatMessage table...')

  await c.query(`
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

    CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId");
    CREATE INDEX IF NOT EXISTS "ChatMessage_businessId_idx" ON "ChatMessage"("businessId");
    CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

    ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;

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
  `)

  console.log('ChatMessage table and RLS policies created successfully.')
  await c.end()
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})

