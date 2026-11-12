require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  console.log('Adding admin response columns to SupportMessage...')

  await c.query(`
    ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
    ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "adminRepliedAt" TIMESTAMP(3);
    ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "adminEmail" TEXT;
  `)

  const res = await c.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'SupportMessage';
  `)

  console.log('SupportMessage columns:', res.rows.map(r => `${r.column_name} (${r.data_type})`))
  await c.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

