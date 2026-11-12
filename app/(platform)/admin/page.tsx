import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getPlatformSession } from '@/lib/platform-auth'
import { withSystemRls } from '@/lib/rls'
import PlatformAvatarMenu from '../platform-avatar-menu'
import AdminView, { type BusinessSummary } from './admin-view'

export const metadata: Metadata = {
  title: 'Platform Admin Console | Operafrika',
  description: 'Internal operations, SME accounts, and currency correction',
}

export const dynamic = 'force-dynamic'

export default async function AdminConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; currency?: string }>
}) {
  const session = await getPlatformSession()

  if (!session) {
    redirect('/platform/auth')
  }

  if (!session.canAccessAdminConsole) {
    if (session.canAccessFounderDashboard) {
      redirect('/founder')
    }
    redirect('/platform/auth')
  }

  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const pageSize = 5
  const skip = (currentPage - 1) * pageSize
  const searchQuery = params.search?.trim() || undefined
  const currencyQuery = params.currency?.trim() || undefined

  const {
    businessCount,
    userCount,
    branchCount,
    totalBusinessesCount,
    businesses,
    initialSupportMessages,
    pendingSupportCount,
    totalSupportCount,
    systemHealth,
    complianceOverview,
  } = await withSystemRls(
    async (tx) => {
      const businessCount = await tx.business.count({
        where: { deletedAt: null },
      })
      const userCount = await tx.user.count({ where: { deletedAt: null } })
      const branchCount = await tx.branch.count()

      const whereClause: any = { deletedAt: null }
      if (searchQuery) {
        whereClause.OR = [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { id: { contains: searchQuery, mode: 'insensitive' } },
          { businessType: { contains: searchQuery, mode: 'insensitive' } },
        ]
      }
      if (currencyQuery && currencyQuery !== 'ALL') {
        whereClause.currency = currencyQuery
      }

      const totalBusinessesCount = await tx.business.count({ where: whereClause })

      const totalSupportCount = await tx.supportMessage.count()
      const pendingSupportCount = await tx.supportMessage.count({ where: { resolved: false } })

      const rawSupportMessages = await tx.$queryRaw<
        Array<{
          id: string
          message: string
          resolved: boolean
          createdAt: Date | string
          adminReply: string | null
          adminRepliedAt: Date | string | null
          adminEmail: string | null
          userId: string | null
          userEmail: string | null
          userRole: string | null
          businessId: string | null
          businessName: string | null
          businessCurrency: string | null
          businessType: string | null
        }>
      >`SELECT sm.id, sm.message, sm.resolved, sm."createdAt", sm."adminReply", sm."adminRepliedAt", sm."adminEmail",
               u.id as "userId", u.email as "userEmail", u.role as "userRole",
               b.id as "businessId", b.name as "businessName", b.currency as "businessCurrency", b."businessType" as "businessType"
          FROM "SupportMessage" sm
          LEFT JOIN "User" u ON sm."userId" = u.id
          LEFT JOIN "Business" b ON u."businessId" = b.id
         ORDER BY sm."createdAt" DESC
         LIMIT 40`

      const initialSupportMessages = rawSupportMessages.map((m) => ({
        id: m.id,
        message: m.message,
        resolved: m.resolved,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
        adminReply: m.adminReply ?? null,
        adminRepliedAt: m.adminRepliedAt ? new Date(m.adminRepliedAt).toISOString() : null,
        adminEmail: m.adminEmail ?? null,
        user: m.userId
          ? {
              id: m.userId,
              email: m.userEmail || '',
              role: m.userRole || 'OWNER',
              business: {
                id: m.businessId || '',
                name: m.businessName || 'Business',
                currency: m.businessCurrency || 'NGN',
                businessType: m.businessType || 'SME',
              },
            }
          : null,
      }))

      const rawBusinesses = await tx.business.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          businessType: true,
          currency: true,
          createdAt: true,
          branches: {
            select: { id: true, name: true, address: true },
            take: 10,
          },
          users: {
            where: { role: 'OWNER' },
            select: {
              id: true,
              email: true,
              onboardingCompletedAt: true,
              _count: { select: { sessions: true } },
            },
            take: 1,
          },
          _count: {
            select: {
              branches: true,
              users: true,
            },
          },
          subscription: {
            select: { planName: true, renewalDate: true, price: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      })

      const businesses: BusinessSummary[] = rawBusinesses.map((b) => {
        const owner = b.users[0]
        return {
          id: b.id,
          name: b.name,
          businessType: b.businessType,
          currency: b.currency,
          createdAt: b.createdAt.toISOString(),
          ownerEmail: owner?.email ?? 'Unknown Owner',
          ownerId: owner?.id ?? '',
          onboardingCompleted: Boolean(owner?.onboardingCompletedAt),
          branchesCount: b._count.branches,
          usersCount: b._count.users,
          planName: b.subscription?.planName ?? 'Free (Test Period)',
          subscriptionPrice: Number(b.subscription?.price ?? 0),
          renewalDate: b.subscription?.renewalDate ? b.subscription.renewalDate.toISOString() : null,
          checkinCount: owner?._count?.sessions ?? 1,
          branches: b.branches.map((br) => ({ id: br.id, name: br.name, address: br.address })),
        }
      })

      // System Health measurement
      const dbPingStart = performance.now()
      await tx.$queryRaw`SELECT 1`
      const dbLatencyMs = Math.max(1, Math.round(performance.now() - dbPingStart))

      const activeSessionsCount = await tx.session.count({
        where: { expiresAt: { gt: new Date() } },
      })

      const systemHealth = {
        databaseStatus: 'Healthy (PostgreSQL)',
        databaseLatencyMs: dbLatencyMs,
        aiServiceStatus: process.env.GEMINI_API_KEY ? 'Configured (Gemini Free Tier)' : 'Missing GEMINI_API_KEY',
        rlsEnforcement: 'Active (PostgreSQL Policies Enforced)',
        activeSessionsCount,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      }

      // Compliance & Account Lifecycle (NDPA)
      const scheduledDeletionsCount = await tx.business.count({
        where: { deletedAt: { not: null } },
      })

      const lockedOrBannedUsersCount = await tx.user.count({
        where: {
          OR: [
            { bannedAt: { not: null } },
            { lockedUntil: { gt: new Date() } },
          ],
        },
      })

      const deletingBusinesses = await tx.business.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true,
          name: true,
          deletedAt: true,
          deletionScheduledFor: true,
          users: {
            where: { role: 'OWNER' },
            select: { email: true },
            take: 1,
          },
        },
        take: 10,
      })

      const pendingDeletions = deletingBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        ownerEmail: b.users[0]?.email || 'Unknown',
        deletedAt: b.deletedAt ? b.deletedAt.toISOString() : null,
        deletionScheduledFor: b.deletionScheduledFor ? b.deletionScheduledFor.toISOString() : null,
      }))

      const complianceOverview = {
        scheduledDeletionsCount,
        lockedOrBannedUsersCount,
        pendingDeletions,
      }

      return {
        businessCount,
        userCount,
        branchCount,
        totalBusinessesCount,
        businesses,
        initialSupportMessages,
        pendingSupportCount,
        totalSupportCount,
        systemHealth,
        complianceOverview,
      }
    },
  )

  const totalPages = Math.ceil(totalBusinessesCount / pageSize)

  return (
    <main
      className="route-page-container"
      style={{
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        textAlign: 'left',
        padding: 'var(--ds-space-6) var(--ds-space-10)',
        backgroundColor: 'var(--ds-color-surface)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-6)',
        }}
      >
        {/* Minimalist Top Platform Header: ONLY brand logo on left, ONLY round avatar menu on right */}
        <header
          role="banner"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'var(--ds-color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: 'var(--ds-space-6)',
            paddingBottom: 'var(--ds-space-4)',
            borderBottom: '1px solid var(--ds-color-outline-variant)',
          }}
        >
          {/* Brand Logo only on left */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                border: '1px solid var(--ds-color-outline-variant)',
                flexShrink: 0,
              }}
            >
              <Image src="/icon.svg" alt="Operafrika" width={28} height={28} priority />
            </div>
          </div>

          {/* Round Avatar Icon Menu on right */}
          <PlatformAvatarMenu
            email={session.email}
            canAccessAdmin={session.canAccessAdminConsole}
            canAccessFounder={session.canAccessFounderDashboard}
            currentArea="admin"
          />
        </header>

        {/* Page Title & Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--ds-color-on-surface)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Platform Admin Console
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: 'var(--ds-color-on-surface-variant)',
            }}
          >
            SME account governance, branch deployments, and currency corrections
          </p>
        </div>

        {/* Interactive Admin Console Content */}
        <AdminView
          businesses={businesses}
          businessCount={businessCount}
          userCount={userCount}
          branchCount={branchCount}
          totalBusinessesCount={totalBusinessesCount}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          userEmail={session.email}
          canAccessFounder={session.canAccessFounderDashboard}
          initialSupportMessages={initialSupportMessages}
          pendingSupportCount={pendingSupportCount}
          totalSupportCount={totalSupportCount}
          systemHealth={systemHealth}
          complianceOverview={complianceOverview}
        />
      </div>
    </main>
  )
}
