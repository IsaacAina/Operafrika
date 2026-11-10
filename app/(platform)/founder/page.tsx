import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getPlatformSession } from '@/lib/platform-auth'
import { withSystemRls } from '@/lib/rls'
import PlatformAvatarMenu from '../platform-avatar-menu'
import FounderView, { type SignupRecord, type PlanBreakdown } from './founder-view'

export const metadata: Metadata = {
  title: 'Founder Dashboard | Operafrika',
  description: 'High-level business velocity and onboarding conversion metrics',
}

export const dynamic = 'force-dynamic'

export default async function FounderDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getPlatformSession()

  if (!session) {
    redirect('/platform/auth')
  }

  if (!session.canAccessFounderDashboard) {
    if (session.canAccessAdminConsole) {
      redirect('/admin')
    }
    redirect('/platform/auth')
  }

  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const pageSize = 5
  const skip = (currentPage - 1) * pageSize

  const data = await withSystemRls(async (tx) => {
    const businessCount = await tx.business.count({
      where: { deletedAt: null },
    })
    const userCount = await tx.user.count({ where: { deletedAt: null } })
    const branchCount = await tx.branch.count()

    // Aggregate onboarding completion across all owner accounts
    const completedOnboardingCount = await tx.user.count({
      where: {
        role: 'OWNER',
        onboardingCompletedAt: { not: null },
        business: { deletedAt: null },
      },
    })

    // Aggregate plan breakdown across all active subscriptions
    const allSubscriptions = await tx.subscription.findMany({
      where: { business: { deletedAt: null } },
      select: { planName: true },
    })

    const planCounts: Record<string, number> = {}
    for (const sub of allSubscriptions) {
      const planName = sub.planName || 'Free (Test Period)'
      planCounts[planName] = (planCounts[planName] || 0) + 1
    }

    const planBreakdown: PlanBreakdown[] = Object.entries(planCounts).map(([planName, count]) => ({
      planName,
      count,
      percentage: businessCount > 0 ? Math.round((count / businessCount) * 100) : 0,
    }))

    if (planBreakdown.length === 0) {
      planBreakdown.push({
        planName: 'Free (Test Period)',
        count: businessCount,
        percentage: 100,
      })
    }

    // Paginated signups (5 per page)
    const paginatedBusinesses = await tx.business.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        businessType: true,
        currency: true,
        createdAt: true,
        subscription: {
          select: { planName: true },
        },
        users: {
          where: { role: 'OWNER' },
          select: {
            email: true,
            onboardingCompletedAt: true,
            _count: { select: { sessions: true } },
          },
          take: 1,
        },
        _count: {
          select: { branches: true, users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    })

    const recentSignups: SignupRecord[] = paginatedBusinesses.map((b) => {
      const owner = b.users[0]
      const isCompleted = Boolean(owner?.onboardingCompletedAt)
      const planName = b.subscription?.planName ?? 'Free (Test Period)'

      return {
        id: b.id,
        name: b.name,
        currency: b.currency,
        businessType: b.businessType,
        ownerEmail: owner?.email ?? 'Unknown Owner',
        planName,
        branchCount: b._count.branches,
        userCount: b._count.users,
        checkinCount: owner?._count?.sessions ?? 1,
        onboardingCompleted: isCompleted,
        createdAt: b.createdAt.toISOString(),
      }
    })

    const totalPages = Math.max(1, Math.ceil(businessCount / pageSize))

    return {
      businessCount,
      userCount,
      branchCount,
      completedOnboardingCount,
      inProgressOnboardingCount: Math.max(0, businessCount - completedOnboardingCount),
      planBreakdown,
      recentSignups,
      currentPage,
      totalPages,
      pageSize,
      totalSignupsCount: businessCount,
    }
  })

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
            currentArea="founder"
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
            Founder Dashboard
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: 'var(--ds-color-on-surface-variant)',
            }}
          >
            SME network growth velocity, signup funnel, and onboarding completion
          </p>
        </div>

        {/* Interactive Founder View Content */}
        <FounderView
          businessCount={data.businessCount}
          userCount={data.userCount}
          branchCount={data.branchCount}
          completedOnboardingCount={data.completedOnboardingCount}
          inProgressOnboardingCount={data.inProgressOnboardingCount}
          planBreakdown={data.planBreakdown}
          recentSignups={data.recentSignups}
          canAccessAdmin={session.canAccessAdminConsole}
          userEmail={session.email}
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          pageSize={data.pageSize}
          totalSignupsCount={data.totalSignupsCount}
        />
      </div>
    </main>
  )
}
