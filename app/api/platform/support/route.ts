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
      const counts = await tx.$queryRaw<Array<{ total: bigint; pending: bigint; resolved: bigint }>>`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE resolved = false)::bigint AS pending,
          COUNT(*) FILTER (WHERE resolved = true)::bigint AS resolved
        FROM "SupportMessage"
      `
      const totalCount = Number(counts[0]?.total ?? 0)
      const pendingCount = Number(counts[0]?.pending ?? 0)
      const resolvedCount = Number(counts[0]?.resolved ?? 0)

      let rawRows: any[] = []
      if (status === 'pending') {
        rawRows = await tx.$queryRaw<any[]>`
          SELECT sm.id, sm.message, sm.resolved, sm."createdAt", sm."adminReply", sm."adminRepliedAt", sm."adminEmail",
                 u.id as "userId", u.email as "userEmail", u.role as "userRole",
                 b.id as "businessId", b.name as "businessName", b.currency as "businessCurrency", b."businessType" as "businessType"
            FROM "SupportMessage" sm
            LEFT JOIN "User" u ON sm."userId" = u.id
            LEFT JOIN "Business" b ON u."businessId" = b.id
           WHERE sm.resolved = false
           ORDER BY sm."createdAt" DESC
           LIMIT ${pageSize} OFFSET ${skip}
        `
      } else if (status === 'resolved') {
        rawRows = await tx.$queryRaw<any[]>`
          SELECT sm.id, sm.message, sm.resolved, sm."createdAt", sm."adminReply", sm."adminRepliedAt", sm."adminEmail",
                 u.id as "userId", u.email as "userEmail", u.role as "userRole",
                 b.id as "businessId", b.name as "businessName", b.currency as "businessCurrency", b."businessType" as "businessType"
            FROM "SupportMessage" sm
            LEFT JOIN "User" u ON sm."userId" = u.id
            LEFT JOIN "Business" b ON u."businessId" = b.id
           WHERE sm.resolved = true
           ORDER BY sm."createdAt" DESC
           LIMIT ${pageSize} OFFSET ${skip}
        `
      } else {
        rawRows = await tx.$queryRaw<any[]>`
          SELECT sm.id, sm.message, sm.resolved, sm."createdAt", sm."adminReply", sm."adminRepliedAt", sm."adminEmail",
                 u.id as "userId", u.email as "userEmail", u.role as "userRole",
                 b.id as "businessId", b.name as "businessName", b.currency as "businessCurrency", b."businessType" as "businessType"
            FROM "SupportMessage" sm
            LEFT JOIN "User" u ON sm."userId" = u.id
            LEFT JOIN "Business" b ON u."businessId" = b.id
           ORDER BY sm."createdAt" DESC
           LIMIT ${pageSize} OFFSET ${skip}
        `
      }

      const formatted = rawRows.map((m) => ({
        id: m.id,
        message: m.message,
        resolved: m.resolved,
        createdAt: m.createdAt,
        adminReply: m.adminReply ?? null,
        adminRepliedAt: m.adminRepliedAt ?? null,
        adminEmail: m.adminEmail ?? null,
        user: m.userId
          ? {
              id: m.userId,
              email: m.userEmail,
              role: m.userRole,
              business: {
                id: m.businessId,
                name: m.businessName,
                currency: m.businessCurrency,
                businessType: m.businessType,
              },
            }
          : null,
      }))

      return { messages: formatted, totalCount, pendingCount, resolvedCount }
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

