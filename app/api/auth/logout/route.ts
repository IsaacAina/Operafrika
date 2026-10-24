import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST() {
  const result = await clearSession()

  if (!result.sessionDeleted) {
    return NextResponse.json(
      {
        error:
          'Your browser session was ended, but the server session could not be revoked. Please contact support.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, redirect: '/app/auth?view=login' })
}
