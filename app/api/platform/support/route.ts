import { NextResponse } from 'next/server'
import { getPlatformSession } from '@/lib/platform-auth'
import { withSystemRls } from '@/lib/rls'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/platform/support
 * Lists support messages across all SME businesses for Platform Admins.
 */
export async function GET(request: Request) {
  const session = await getPlatformSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.canAccessAdminConsole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = 10
  const skip = (page - 1) * pageSize

  try {
    const whereClause: Prisma.SupportMessageWhereInput = {}
    if (status === 'pending') {
      whereClause.resolved = false
    } else if (status === 'resolved') {
      whereClause.resolved = true
    }

    const { messages, totalCount, pendingCount, resolvedCount } = await withSystemRls(async (tx) => {
      const totalCount = await tx.supportMessage.count()
      const pendingCount = await tx.supportMessage.count({ where: { resolved: false } })
      const resolvedCount = await tx.supportMessage.count({ where: { resolved: true } })

      const messages = await tx.supportMessage.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              business: {
                select: {
                  id: true,
                  name: true,
                  businessType: true,
                  currency: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      })

      return { messages, totalCount, pendingCount, resolvedCount }
    })

    const filteredTotal =
      status === 'pending'
        ? pendingCount
        : status === 'resolved'
        ? resolvedCount
        : totalCount

    const totalPages = Math.ceil(filteredTotal / pageSize) || 1

    return NextResponse.json({
      messages,
      totalCount,
      pendingCount,
      resolvedCount,
      page,
      totalPages,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve support messages' },
      { status: 500 }
    )
  }
}

