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

      const rawSupportMessages = await tx.supportMessage.findMany({
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
                  currency: true,
                  businessType: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      })

      const initialSupportMessages = rawSupportMessages.map((m) => ({
        id: m.id,
        message: m.message,
        resolved: m.resolved,
        createdAt: m.createdAt.toISOString(),
        user: m.user
          ? {
              id: m.user.id,
              email: m.user.email,
              role: m.user.role,
              business: {
                id: m.user.business.id,
                name: m.user.business.name,
                currency: m.user.business.currency,
                businessType: m.user.business.businessType,
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

      return {
        businessCount,
        userCount,
        branchCount,
        totalBusinessesCount,
        businesses,
        initialSupportMessages,
        pendingSupportCount,
        totalSupportCount,
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
        />
      </div>
    </main>
  )
}
