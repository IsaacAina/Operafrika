import { NextResponse } from 'next/server'
import { getPlatformSession } from '@/lib/platform-auth'
import { withSystemRls } from '@/lib/rls'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/platform/support/[id]
 * Updates a support message's resolved status.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPlatformSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.canAccessAdminConsole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (typeof body?.resolved !== 'boolean') {
      return NextResponse.json(
        { error: 'Field "resolved" must be a boolean.' },
        { status: 400 }
      )
    }

    const updated = await withSystemRls(async (tx) => {
      const existing = await tx.supportMessage.findUnique({
        where: { id },
      })

      if (!existing) {
        return null
      }

      return tx.supportMessage.update({
        where: { id },
        data: {
          resolved: body.resolved,
        },
      })
    })

    if (!updated) {
      return NextResponse.json({ error: 'Support message not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update support message' },
      { status: 500 }
    )
  }
}

