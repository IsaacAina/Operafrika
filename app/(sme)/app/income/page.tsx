import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { listIncomeEntries } from '@/lib/financials'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import IncomeView from './income-view'
import { ArrowLeft, TrendingUp, Store } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Direct Income | Operafrika',
  description: 'Track miscellaneous income, direct deposits, and non-invoice cash flow',
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[]; page?: string; search?: string }>
}) {
  const user = await getRequestUser()
  if (!user) redirect('/app/auth?view=login')
  if (!user.emailVerified) redirect('/app/auth/verify-email')

  const params = await searchParams
  const branchParam = typeof params.branch === 'string' ? params.branch : undefined
  const page = parseInt(typeof params.page === 'string' ? params.page : '1', 10)
  const search = typeof params.search === 'string' ? params.search : undefined

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

      if (user.role === 'STAFF') {
        return {
          onboarding: false as const,
          business,
          scope,
          incomeResult: { entries: [], totalCount: 0, totalAmount: 0, page: 1, pageSize: 20, totalPages: 0 },
          customers: [],
          metrics: { totalAmount: 0, todayAmount: 0, monthAmount: 0, totalEntries: 0 },
        }
      }

      // Fetch paginated income entries
      const incomeResult = await listIncomeEntries(tx, {
        businessId: user.businessId,
        branchIds: scope.branchIds,
        search,
        page,
        pageSize: 15,
      })

      // Customers for selection
      const customers = await tx.customer.findMany({
        where: { branchId: { in: scope.branchIds } },
        select: {
          id: true,
          name: true,
          contact: true,
          branchId: true,
        },
        orderBy: { name: 'asc' },
      })

      // Metrics calculation
      const now = new Date()
      const todayStart = startOfDay(now)
      const tomorrow = addDays(todayStart, 1)
      const monthStart = startOfMonth(now)

      const [todayAgg, monthAgg] = await Promise.all([
        tx.incomeEntry.aggregate({
          where: {
            branchId: { in: scope.branchIds },
            date: { gte: todayStart, lt: tomorrow },
          },
          _sum: { amount: true },
        }),
        tx.incomeEntry.aggregate({
          where: {
            branchId: { in: scope.branchIds },
            date: { gte: monthStart, lt: tomorrow },
          },
          _sum: { amount: true },
        }),
      ])

      return {
        onboarding: false as const,
        business,
        scope,
        incomeResult,
        customers,
        metrics: {
          totalAmount: incomeResult.totalAmount,
          todayAmount: Number(todayAgg._sum.amount ?? 0),
          monthAmount: Number(monthAgg._sum.amount ?? 0),
          totalEntries: incomeResult.totalCount,
        },
      }
    },
  )

  if (data.onboarding) {
    redirect('/app/onboarding')
  }

  const { business, scope, incomeResult, customers, metrics } = data
  const currency = business?.currency || 'NGN'

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
        <header role="banner" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
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
                  {business?.name ?? 'Operafrika'}
                </span>
                <span className="subpage-header-subtitle-text">
                  <TrendingUp size={13} color="var(--ds-color-primary)" />
                  <span>Direct Income &middot; <strong>{currency}</strong></span>
                </span>
              </div>
            </div>

            {/* Right Side Header: Notifications & Round Avatar Menu */}
            <div className="subpage-header-right">
              <NotificationCenter />
              <UserAvatarMenu
                name={business?.name ?? 'Operafrika Business'}
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
            <h1 className="subpage-mobile-title">Direct Income &amp; Inflows</h1>
          </div>
        </header>

        {/* Page Title & Branch Filter Bar (Hidden on mobile if single-branch to prevent blank container) */}
        <div className={scope.canViewAllBranches && scope.branches.length > 1 ? "subpage-title-bar" : "subpage-title-bar subpage-title-bar-single"}>
          <div className="subpage-title-block subpage-desktop-title-block">
            <h1 className="subpage-title-heading">
              Direct Income &amp; Inflows
            </h1>
            <p className="subpage-title-desc">
              Track miscellaneous income, capital deposits, and non-invoice cash flow
            </p>
          </div>

          {/* Branch Switcher (Owner only) */}
          {scope.canViewAllBranches && scope.branches.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-2)',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/app/income"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: scope.isCombined ? 'var(--ds-color-primary)' : 'var(--ds-color-surface-container-low)',
                  color: scope.isCombined ? '#ffffff' : 'var(--ds-color-on-surface)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                All Branches
              </Link>
              {scope.branches.map((b) => {
                const isActive = scope.selectedBranch?.id === b.id
                return (
                  <Link
                    key={b.id}
                    href={`/app/income?branch=${b.id}`}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--ds-radius-md)',
                      backgroundColor: isActive ? 'var(--ds-color-primary)' : 'var(--ds-color-surface-container-low)',
                      color: isActive ? '#ffffff' : 'var(--ds-color-on-surface)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {b.name}
                  </Link>
                )
              })}
            </div>
          )}

          {!scope.canViewAllBranches && scope.selectedBranch && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--ds-radius-md)',
                backgroundColor: 'var(--ds-color-surface-container-high)',
                color: 'var(--ds-color-on-surface)',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              <Store size={14} color="var(--ds-color-primary)" />
              <span>Branch: {scope.selectedBranch.name}</span>
            </span>
          )}
        </div>

        {/* Interactive Income View */}
        <IncomeView
          initialEntries={incomeResult.entries}
          totalCount={incomeResult.totalCount}
          currentPage={incomeResult.page}
          pageSize={incomeResult.pageSize}
          totalPages={incomeResult.totalPages}
          metrics={metrics}
          branches={scope.branches}
          selectedBranchId={scope.selectedBranch?.id}
          currency={currency}
          userRole={user.role}
          customers={customers}
        />
      </div>
    </main>
  )
}
