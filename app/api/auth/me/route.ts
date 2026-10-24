import { NextResponse } from 'next/server'
import { readCurrentUser } from '@/lib/current-user'

/**
 * Returns the signed in user for the client cache, or null when there is no
 * valid session. The client uses this to revalidate the user it was seeded
 * with; it is not an authorization decision in itself.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await readCurrentUser()

  return NextResponse.json(
    { user },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
