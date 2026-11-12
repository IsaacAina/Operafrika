import { NextResponse } from 'next/server'
import { getPlatformSession } from '@/lib/platform-auth'
import { withSystemRls } from '@/lib/rls'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/platform/support/[id]
 * Updates a support message's resolved status and/or stores an admin reply.
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
    if (!body || (typeof body.resolved !== 'boolean' && typeof body.adminReply !== 'string')) {
      return NextResponse.json(
        { error: 'Provide "resolved" (boolean) and/or "adminReply" (string).' },
        { status: 400 }
      )
    }

    const updateData: {
      resolved?: boolean
      adminReply?: string
      adminRepliedAt?: Date
      adminEmail?: string
    } = {}

    if (typeof body.adminReply === 'string') {
      const trimmedReply = body.adminReply.trim()
      if (trimmedReply.length > 3000) {
        return NextResponse.json(
          { error: 'Admin reply cannot exceed 3,000 characters.' },
          { status: 400 }
        )
      }
      updateData.adminReply = trimmedReply
      updateData.adminRepliedAt = new Date()
      updateData.adminEmail = session.email || 'Platform Admin'
      // Default to resolved when replying, unless explicitly specified
      updateData.resolved = typeof body.resolved === 'boolean' ? body.resolved : true
    } else if (typeof body.resolved === 'boolean') {
      updateData.resolved = body.resolved
    }

    const updated = await withSystemRls(async (tx) => {
      const existing = await tx.supportMessage.findUnique({
        where: { id },
      })

      if (!existing) {
        return null
      }

      try {
        return await tx.supportMessage.update({
          where: { id },
          data: updateData as any,
        })
      } catch (prismaErr: any) {
        // Fallback to raw SQL if the in-memory Prisma client was loaded before schema migration
        if (prismaErr?.message?.includes('Unknown argument') || prismaErr?.message?.includes('adminReply')) {
          const sets: string[] = []
          const queryParams: any[] = []
          let pIdx = 1

          if (typeof updateData.resolved === 'boolean') {
            sets.push(`"resolved" = $${pIdx++}`)
            queryParams.push(updateData.resolved)
          }
          if (updateData.adminReply !== undefined) {
            sets.push(`"adminReply" = $${pIdx++}`)
            queryParams.push(updateData.adminReply)
          }
          if (updateData.adminRepliedAt !== undefined) {
            sets.push(`"adminRepliedAt" = $${pIdx++}`)
            queryParams.push(updateData.adminRepliedAt)
          }
          if (updateData.adminEmail !== undefined) {
            sets.push(`"adminEmail" = $${pIdx++}`)
            queryParams.push(updateData.adminEmail)
          }

          if (sets.length > 0) {
            queryParams.push(id)
            const query = `UPDATE "SupportMessage" SET ${sets.join(', ')} WHERE id = $${pIdx} RETURNING *`
            const rawRows = await tx.$queryRawUnsafe<any[]>(query, ...queryParams)
            return rawRows[0] || null
          }
        }
        throw prismaErr
      }
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
      { error: error?.message || 'Failed to update support message' },
      { status: 500 }
    )
  }
}

