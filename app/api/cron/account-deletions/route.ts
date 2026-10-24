import { NextResponse } from 'next/server'
import { purgeExpiredAccountDeletions } from '@/lib/account-deletion'

/**
 * The daily purge job.
 *
 * Call it once a day with the shared secret:
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://<host>/api/cron/account-deletions
 *
 * The same work runs from scripts/purge-scheduled-deletions.mjs, so the job
 * can also be driven by the operating system scheduler.
 */
export const dynamic = 'force-dynamic'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get('authorization')
  if (!header) return false

  const [scheme, token] = header.split(' ')
  if (!scheme || !token) return false
  if (scheme.toLowerCase() !== 'bearer') return false

  return token === secret
}

async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured. The purge job is disabled.' },
      { status: 503 },
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = await purgeExpiredAccountDeletions()

  return NextResponse.json({
    success: true,
    purgedUsers: report.purgedUsers,
    purgedBusinesses: report.purgedBusinesses,
    failures: report.failures,
  })
}

export async function POST(request: Request) {
  return handle(request)
}

export async function GET(request: Request) {
  return handle(request)
}
