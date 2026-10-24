import { NextResponse } from 'next/server'
import { getPlatformSession } from '@/lib/platform-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getPlatformSession()
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } })
}
