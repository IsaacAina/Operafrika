import { register } from 'node:module'
import 'dotenv/config'

register('./ts-resolver.mjs', import.meta.url)

const { prisma } = await import('../lib/db.ts')
const { purgeExpiredAccountDeletions } = await import('../lib/account-deletion.ts')

/**
 * Purges every account and business whose deletion grace period has ended.
 *
 * Run it once a day from the operating system scheduler:
 *
 *   Windows   schtasks /create /tn "Operafrika purge" /sc daily /tn Operafrika /tr "npm run purge:deletions"
 *   Linux     0 3 * * * cd /path/to/app && npm run purge:deletions
 *
 * The job is safe to run more than once. Anything that is not due yet is left
 * alone, and a record that fails to purge is reported and retried on the next
 * run.
 */
async function main() {
  const report = await purgeExpiredAccountDeletions()

  console.log('Purged accounts:  ', report.purgedUsers)
  console.log('Purged businesses:', report.purgedBusinesses)

  if (report.failures.length > 0) {
    console.error('Failures:')
    for (const failure of report.failures) {
      console.error(` - ${failure.scope} ${failure.id}: ${failure.error}`)
    }
    process.exitCode = 1
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
