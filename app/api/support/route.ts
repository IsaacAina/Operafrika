import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { withSystemRls } from '@/lib/rls'

export const dynamic = 'force-dynamic'

/**
 * GET /api/support
 * Lists support messages submitted by the current authenticated user.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 })
  }

  try {
    const messages = await withSystemRls(async (tx) => {
      return tx.$queryRaw<any[]>`
        SELECT id, message, resolved, "createdAt", "adminReply", "adminRepliedAt", "adminEmail"
          FROM "SupportMessage"
         WHERE "userId" = ${session.userId}
         ORDER BY "createdAt" DESC
         LIMIT 40
      `
    })

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error('[API /api/support GET error]:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch support messages' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/support
 * Submits a new support message or inquiry to the Operafrika platform team.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'A message is required.' },
        { status: 400 }
      )
    }

    const message = body.message.trim()
    if (message.length < 5) {
      return NextResponse.json(
        { error: 'Message must be at least 5 characters long.' },
        { status: 400 }
      )
    }

    if (message.length > 3000) {
      return NextResponse.json(
        { error: 'Message cannot exceed 3,000 characters.' },
        { status: 400 }
      )
    }

    // Insert support message tied strictly to authenticated user's ID
    const newMessage = await withSystemRls(async (tx) => {
      return tx.supportMessage.create({
        data: {
          userId: session.userId,
          message,
          resolved: false,
        },
      })
    })

    return NextResponse.json(
      { success: true, message: newMessage },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API /api/support POST error]:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send support message' },
      { status: 500 }
    )
  }
}
