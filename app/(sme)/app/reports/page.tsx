import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import {
  getProfitLossStatement,
  getStaffSalesStatement,
  type ReportActor,
  type ProfitLossStatement,
  type StaffSalesStatement,
} from '@/lib/reports'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import ReportsView from './reports-view'
import { BarChart3, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Reports & Exports | Operafrika',
  description: 'Branch and consolidated profit & loss statements, financial records, and CSV/PDF exports',
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    branch?: string | string[]
    from?: string
    to?: string
  }>
}) {
  const user = await getRequestUser()
  if (!user) redirect('/app/auth?view=login')
  if (!user.emailVerified) redirect('/app/auth/verify-email')

  const params = await searchParams
  const branchParam = typeof params.branch === 'string' ? params.branch : undefined
  const fromParam = typeof params.from === 'string' ? params.from : undefined
  const toParam = typeof params.to === 'string' ? params.to : undefined

  // Default date window: Current Month
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const from = fromParam ? new Date(fromParam) : defaultFrom
  const to = toParam ? new Date(toParam) : defaultTo

  const rlsRole = toRlsRole(user.role)

  const data = await withRls(
    {
      role: rlsRole,
      businessId: user.businessId,
      userId: user.userId,
    },
    async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.userId },
        select: { onboardingCompletedAt: true },
      })

      if (!dbUser?.onboardingCompletedAt) {
        return { onboarding: true as const }
      }

      const business = await tx.business.findUnique({
        where: { id: user.businessId },
        select: { name: true, currency: true },
      })

      const scope = await getDashboardScope(tx, {
        userId: user.userId,
        businessId: user.businessId,
        role: user.role,
        branchParam,
      })

      const actor: ReportActor = {
        userId: user.userId,
        role: user.role,
        businessId: user.businessId,
        email: user.email,
      }

      let plStatement: ProfitLossStatement | null = null
      let staffSalesStatement: StaffSalesStatement | null = null

      if (user.role === 'STAFF') {
        const branchId = scope.selectedBranch?.id || scope.branches[0]?.id
        if (branchId) {
          staffSalesStatement = await getStaffSalesStatement(tx, actor, {
            branchId,
            branchName: scope.selectedBranch?.name || 'Assigned Branch',
            from,
            to,
          })
        }
      } else {
        const branchIds = scope.isCombined
          ? scope.branches.map((b) => b.id)
          : scope.selectedBranch
            ? [scope.selectedBranch.id]
            : scope.branches.map((b) => b.id)

        const branchName = scope.isCombined
          ? 'All Branches'
          : scope.selectedBranch?.name || 'Branch'

        plStatement = await getProfitLossStatement(tx, actor, {
          branchIds,
          branchName,
          from,
          to,
        })
      }

      return {
        onboarding: false as const,
        business,
        scope,
        plStatement,
        staffSalesStatement,
      }
    }
  )

  if (data.onboarding) {
    redirect('/app/onboarding')
  }

  const branches = data.scope.branches.map((b) => ({
    id: b.id,
    name: b.name,
  }))

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
        {/* Global SME Header */}
        <header role="banner" style={{ width: '100%' }}>
          {/* Desktop Header */}
          <div className="subpage-desktop-header">
            {/* Brand Logo & Back to Dashboard */}
            <div className="subpage-header-left">
              <Link
                href="/app"
                aria-label="Back to dashboard"
                title="Back to dashboard"
                className="subpage-header-btn"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="subpage-header-logo-box">
                <Image src="/icon.svg" alt="Operafrika" width={28} height={28} priority />
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="subpage-header-title-text">
                  {data.business?.name || 'Operafrika Business'}
                </span>
                <span className="subpage-header-subtitle-text">
                  <BarChart3 size={13} color="var(--ds-color-primary)" />
                  <span>Reports &amp; Financial Statements &middot; <strong>{data.business?.currency ?? 'NGN'}</strong></span>
                </span>
              </div>
            </div>

            {/* Right Side Header: Notifications & Round Avatar Menu */}
            <div className="subpage-header-right">
              <NotificationCenter />
              <UserAvatarMenu
                name={data.business?.name ?? 'Operafrika Business'}
                email={user.email}
                role={user.role}
              />
            </div>
          </div>

          {/* Mobile Subpage Header: Back button and only the title of the rendered page */}
          <div className="subpage-mobile-header">
            <Link
              href="/app"
              aria-label="Back to dashboard"
              title="Back to dashboard"
              className="subpage-header-btn"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="subpage-mobile-title">P&amp;L Reports &amp; Exports</h1>
          </div>
        </header>

        {/* Interactive Reports View */}
        <ReportsView
          initialPlStatement={data.plStatement}
          initialStaffSales={data.staffSalesStatement}
          branches={branches}
          selectedBranchId={data.scope.selectedBranch?.id}
          currency={data.business?.currency || 'NGN'}
          userRole={user.role}
          userEmail={user.email}
          businessName={data.business?.name || 'Operafrika Business'}
          currentFrom={from.toISOString()}
          currentTo={to.toISOString()}
        />
      </div>
    </main>
  )
}
