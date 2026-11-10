import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import { getDashboardMetrics, getDashboardScope } from '@/lib/dashboard'
import { toRlsRole, withRls } from '@/lib/rls'
import UserAvatarMenu from './user-avatar-menu'
import NotificationCenter from './notification-center'
import {
  Receipt,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Briefcase,
  Store,
  Settings,
  Calendar,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Scale,
  PlusCircle,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard | Operafrika',
  description: 'Business operating system overview and performance metrics',
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export default async function SmeAppPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[] }>
}) {
  const user = await getRequestUser()

  if (!user) {
    redirect('/app/auth?view=login')
  }

  if (!user.emailVerified) {
    redirect('/app/auth/verify-email')
  }

  const params = await searchParams
  const branchParam =
    typeof params.branch === 'string' ? params.branch : undefined
  const rlsRole = toRlsRole(user.role)

  const pageData = await withRls(
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

      return { onboarding: false as const, business, scope }
    },
  )

  if (pageData.onboarding) {
    redirect('/app/onboarding')
  }

  const { business, scope } = pageData
  const metrics = await withRls(
    {
      role: rlsRole,
      businessId: user.businessId,
      branchId: scope.selectedBranch?.id,
      userId: user.userId,
    },
    (tx) => getDashboardMetrics(tx, user.businessId, scope),
  )
  const currency = business?.currency ?? 'NGN'
  const hasBranch = scope.branches.length > 0
  const netProfit = metrics.profitLoss?.netProfit ?? 0
  const isNetPositive = netProfit >= 0

  // Role-based categorized navigation with Lucide icons and descriptive copy
  const moduleCategories = [
    {
      title: 'Core Operations',
      description: 'Daily transaction logging, customer records, and inventory controls',
      items: [
        {
          href: '/app/sales',
          label: 'Sales & Invoices',
          badge: 'Daily',
          description: 'Record walk-in sales, track unpaid balances, and issue invoices',
          roles: ['OWNER', 'MANAGER', 'STAFF'],
          icon: Receipt,
          color: '#2563eb',
          bgColor: 'rgba(37, 99, 235, 0.1)',
        },
        {
          href: '/app/stock',
          label: 'Stock & Inventory',
          badge: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} Low` : undefined,
          badgeColor: metrics.lowStockCount > 0 ? '#ef6c00' : undefined,
          description:
            user.role === 'STAFF'
              ? 'View live stock levels and reorder alerts'
              : 'Manage items, track restocks, and monitor low inventory',
          roles: ['OWNER', 'MANAGER', 'STAFF'],
          icon: Package,
          color: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.1)',
        },
        {
          href: '/app/customers',
          label: 'Customer Directory',
          badge: 'CRM',
          description: 'Manage profiles, contacts, and customer purchase history',
          roles: ['OWNER', 'MANAGER', 'STAFF'],
          icon: Users,
          color: '#7c3aed',
          bgColor: 'rgba(124, 58, 237, 0.1)',
        },
      ],
    },
    {
      title: 'Financials & Records',
      description: 'Money movements, operating expenses, and performance',
      items: [
        {
          href: '/app/income',
          label: 'Income Entries',
          badge: 'Cash In',
          description: 'Log non-invoice revenue and miscellaneous branch cash flow',
          roles: ['OWNER', 'MANAGER'],
          icon: TrendingUp,
          color: '#16a34a',
          bgColor: 'rgba(22, 163, 74, 0.1)',
        },
        {
          href: '/app/expenses',
          label: 'Expense Tracking',
          badge: 'Cash Out',
          description: 'Record operational costs, utility bills, rent, and supplies',
          roles: ['OWNER', 'MANAGER'],
          icon: TrendingDown,
          color: '#dc2626',
          bgColor: 'rgba(220, 38, 38, 0.1)',
        },
        {
          href: '/app/reports',
          label: 'P&L Reports & Exports',
          badge: 'Analytics',
          description: 'Computed branch statements, financial exports, and CSV/PDF summaries',
          roles: ['OWNER', 'MANAGER', 'STAFF'],
          icon: BarChart3,
          color: '#0891b2',
          bgColor: 'rgba(8, 145, 178, 0.1)',
        },
      ],
    },
    {
      title: 'Organization',
      description: 'Company infrastructure, staff assignments, and preferences',
      items: [
        {
          href: '/app/staff',
          label: 'Staff & Payroll',
          badge: user.role === 'OWNER' ? 'Payroll' : 'Roster',
          description: 'Team roster, branch assignments, and record-only compensation',
          roles: ['OWNER', 'MANAGER'],
          icon: Briefcase,
          color: '#9333ea',
          bgColor: 'rgba(147, 51, 234, 0.1)',
        },
        {
          href: '/app/branches',
          label: 'Branch Locations',
          badge: `${scope.branches.length} Active`,
          description: 'Configure physical stores, addresses, and manager assignments',
          roles: ['OWNER'],
          icon: Store,
          color: '#d97706',
          bgColor: 'rgba(217, 119, 6, 0.1)',
        },
        {
          href: '/app/settings',
          label: 'Business Settings',
          badge: 'Config',
          description: 'Company profile, currency info, and operational preferences',
          roles: ['OWNER', 'MANAGER'],
          icon: Settings,
          color: '#475569',
          bgColor: 'rgba(71, 85, 105, 0.1)',
        },
        {
          href: '/app/account',
          label: 'My Account & Security',
          badge: 'Profile',
          description: 'Manage personal password, branch assignment, and NDPA privacy controls',
          roles: ['OWNER', 'MANAGER', 'STAFF'],
          icon: ShieldCheck,
          color: '#0f766e',
          bgColor: 'rgba(15, 118, 110, 0.1)',
        },
        {
          href: '/app/support',
          label: 'Help & Support (FAQ)',
          badge: 'Guides',
          description: 'Search operational FAQs, rules, and send messages to the platform team',
          roles: ['OWNER', 'MANAGER', 'STAFF'],
          icon: HelpCircle,
          color: '#0284c7',
          bgColor: 'rgba(2, 132, 199, 0.1)',
        },
      ],
    },
  ]
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.roles.includes(user.role)),
    }))
    .filter((category) => category.items.length > 0)

  // Quick Action Buttons tailored by role
  const quickActions = [
    { href: '/app/sales', label: 'Record Sale', icon: Receipt, roles: ['OWNER', 'MANAGER', 'STAFF'] },
    ...(user.role !== 'STAFF'
      ? [
        { href: '/app/stock', label: 'Stock Intake', icon: Package, roles: ['OWNER', 'MANAGER'] },
        { href: '/app/expenses', label: 'Log Expense', icon: TrendingDown, roles: ['OWNER', 'MANAGER'] },
        { href: '/app/reports', label: 'View Reports', icon: BarChart3, roles: ['OWNER', 'MANAGER'] },
      ]
      : [
        { href: '/app/customers', label: 'Add Customer', icon: Users, roles: ['STAFF'] },
        { href: '/app/stock', label: 'Check Stock', icon: Package, roles: ['STAFF'] },
      ]),
  ]

  return (
    <main
      className="route-page-container"
      style={{
        alignItems: 'flex-start',
        textAlign: 'left',
        padding: 'var(--ds-space-6) var(--ds-space-10)',
        backgroundColor: 'var(--ds-color-background)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-6)',
          margin: '0 auto',
        }}
      >
        {/* Top Application Header (Static Sticky Bar) */}
        <header
          role="banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 'var(--ds-space-4)',
            borderBottom: '1px solid var(--ds-color-outline-variant)',
            width: '100%',
          }}
        >
          {/* Brand Identity (Straight alignment on left) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)', minWidth: 0, flex: 1 }}>
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
              <Image
                src="/icon.svg"
                alt="Operafrika logo"
                width={28}
                height={28}
                priority
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '1.0625rem',
                  fontWeight: 800,
                  color: 'var(--ds-color-on-surface)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {business?.name ?? 'Operafrika'}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--ds-color-on-surface-variant)',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <ShieldCheck size={13} color="var(--ds-color-primary)" />
                Operating System &middot; <strong>{currency}</strong>
              </span>
            </div>
          </div>

          {/* Right Side Header: Notifications & Round Avatar Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)', flexShrink: 0 }}>
            <NotificationCenter />
            <UserAvatarMenu
              name={business?.name ?? 'Operafrika Business'}
              email={user.email}
              role={user.role}
            />
          </div>
        </header>

        {/* Active Scope & Branch Navigation Bar (Separated from Header, Scrolls with Page) */}
        <div
          className="consolidated-overview-container"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} color="var(--ds-color-primary)" />
                <h1
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  {scope.isCombined
                    ? 'Consolidated Overview (All Branches)'
                    : scope.selectedBranch
                      ? `${scope.selectedBranch.name} Branch`
                      : 'Branch Overview'}
                </h1>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  color: 'var(--ds-color-on-surface-variant)',
                }}
              >
                {scope.isCombined
                  ? `Aggregated live operational records across ${scope.branches.length} branches`
                  : `Isolated records for assigned physical branch: ${scope.selectedBranch?.name ?? 'Branch'}`}
              </p>
            </div>

            {/* Mobile-Friendly Accessible Branch Switcher for Owner */}
            {scope.canViewAllBranches && scope.branches.length > 1 && (
              <nav
                aria-label="Branch scope switcher"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingBottom: '2px',
                  maxWidth: '100%',
                }}
              >
                <Link
                  href="/app"
                  aria-current={scope.isCombined ? 'page' : undefined}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: 'var(--ds-radius-full)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    border: '1px solid',
                    borderColor: scope.isCombined ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                    backgroundColor: scope.isCombined ? 'var(--ds-color-primary)' : 'transparent',
                    color: scope.isCombined ? '#ffffff' : 'var(--ds-color-on-surface)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All Branches
                </Link>
                {scope.branches.map((b) => {
                  const isSelected = scope.selectedBranch?.id === b.id
                  return (
                    <Link
                      key={b.id}
                      href={`/app?branch=${encodeURIComponent(b.id)}`}
                      aria-current={isSelected ? 'page' : undefined}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 'var(--ds-radius-full)',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                        backgroundColor: isSelected ? 'var(--ds-color-primary)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--ds-color-on-surface)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {b.name}
                    </Link>
                  )
                })}
              </nav>
            )}

            {!scope.canViewAllBranches && scope.selectedBranch && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--ds-color-primary)',
                  backgroundColor: 'rgba(15, 118, 110, 0.08)',
                  padding: '4px 10px',
                  borderRadius: 'var(--ds-radius-full)',
                }}
              >
                <MapPin size={14} />
                <span>Assigned: {scope.selectedBranch.name}</span>
              </div>
            )}
          </div>

        {!hasBranch ? (
          <section
            aria-labelledby="no-branch-title"
            className="route-card"
            style={{ padding: 'var(--ds-space-6)', backgroundColor: '#fff3e0', borderColor: '#ffe082' }}
          >
            <h2 id="no-branch-title" className="card-heading" style={{ margin: 0, color: '#e65100' }}>
              No Branch Assigned
            </h2>
            <p className="card-body" style={{ margin: 0, color: '#bf360c' }}>
              Your account currently has no branch access record. Operafrika enforces strict branch scoping for all operations. Please have your business owner link your account to a branch.
            </p>
          </section>
        ) : (
          <>
            {/* Quick Operations Action Bar */}
            <nav
              aria-label="Quick operations"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-2)',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '2px',
              }}
            >
              {quickActions.map((qa) => {
                const Icon = qa.icon
                return (
                  <Link
                    key={qa.label}
                    href={qa.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--ds-radius-md)',
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <Icon size={15} color="var(--ds-color-primary)" />
                    <span>{qa.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Core Metric Indicators (KPIs) */}
            <section
              aria-label="Core operational metrics"
              className="responsive-kpi-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--ds-space-4)',
              }}
            >
              {/* Today Sales */}
              <article
                className="route-card"
                style={{
                  boxShadow: 'none',
                  margin: 0,
                  padding: 'var(--ds-space-5)',
                  borderLeft: '4px solid #2563eb',
                  backgroundColor: 'var(--ds-color-surface-container-lowest)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#2563eb',
                    }}
                  >
                    Sales Today
                  </span>
                  <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)' }}>
                    <DollarSign size={18} color="#2563eb" />
                  </span>
                </div>
                <div style={{ marginTop: 'var(--ds-space-2)' }}>
                  <h2
                    style={{
                      fontSize: '1.625rem',
                      fontWeight: 800,
                      margin: 0,
                      color: 'var(--ds-color-on-surface)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formatMoney(metrics.todaySales.total, currency)}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', marginTop: '4px' }}>
                    {metrics.todaySales.count} {pluralize(metrics.todaySales.count, 'invoice', 'invoices')} recorded today
                  </p>
                </div>
              </article>

              {/* Week Sales */}
              <article
                className="route-card"
                style={{
                  boxShadow: 'none',
                  margin: 0,
                  padding: 'var(--ds-space-5)',
                  borderLeft: '4px solid #16a34a',
                  backgroundColor: 'var(--ds-color-surface-container-lowest)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#16a34a',
                    }}
                  >
                    Week to Date
                  </span>
                  <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)' }}>
                    <Calendar size={18} color="#16a34a" />
                  </span>
                </div>
                <div style={{ marginTop: 'var(--ds-space-2)' }}>
                  <h2
                    style={{
                      fontSize: '1.625rem',
                      fontWeight: 800,
                      margin: 0,
                      color: 'var(--ds-color-on-surface)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formatMoney(metrics.weekSales.total, currency)}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', marginTop: '4px' }}>
                    {metrics.weekSales.count} {pluralize(metrics.weekSales.count, 'invoice', 'invoices')} this rolling week
                  </p>
                </div>
              </article>

              {/* Profit & Loss (Owner & Manager only) */}
              {metrics.profitLoss ? (
                <article
                  className="route-card"
                  style={{
                    boxShadow: 'none',
                    margin: 0,
                    padding: 'var(--ds-space-5)',
                    borderLeft: `4px solid ${isNetPositive ? 'var(--ds-color-primary)' : '#dc2626'}`,
                    backgroundColor: 'var(--ds-color-surface-container-lowest)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: isNetPositive ? 'var(--ds-color-primary)' : '#dc2626',
                      }}
                    >
                      Month-to-Date P&amp;L
                    </span>
                    <span style={{ padding: '6px', borderRadius: '50%', background: isNetPositive ? 'rgba(15, 118, 110, 0.1)' : 'rgba(220, 38, 38, 0.1)' }}>
                      <Scale size={18} color={isNetPositive ? 'var(--ds-color-primary)' : '#dc2626'} />
                    </span>
                  </div>
                  <div style={{ marginTop: 'var(--ds-space-2)' }}>
                    <h2
                      style={{
                        fontSize: '1.625rem',
                        fontWeight: 800,
                        margin: 0,
                        color: isNetPositive ? 'var(--ds-color-primary)' : '#dc2626',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatMoney(netProfit, currency)}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', marginTop: '4px' }}>
                      In: {formatMoney(metrics.profitLoss.revenue, currency)} &middot; Out: {formatMoney(metrics.profitLoss.totalExpenses, currency)}
                    </p>
                  </div>
                </article>
              ) : null}

              {/* Low Stock Alerts */}
              <article
                className="route-card"
                style={{
                  boxShadow: 'none',
                  margin: 0,
                  padding: 'var(--ds-space-5)',
                  borderLeft: `4px solid ${metrics.lowStockCount > 0 ? '#ea580c' : 'var(--ds-color-outline-variant)'}`,
                  backgroundColor: metrics.lowStockCount > 0 ? 'rgba(234, 88, 12, 0.04)' : 'var(--ds-color-surface-container-lowest)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: metrics.lowStockCount > 0 ? '#ea580c' : 'var(--ds-color-on-surface-variant)',
                    }}
                  >
                    Inventory Health
                  </span>
                  <span style={{ padding: '6px', borderRadius: '50%', background: metrics.lowStockCount > 0 ? 'rgba(234, 88, 12, 0.12)' : 'rgba(107, 114, 128, 0.1)' }}>
                    <AlertTriangle size={18} color={metrics.lowStockCount > 0 ? '#ea580c' : '#6b7280'} />
                  </span>
                </div>
                <div style={{ marginTop: 'var(--ds-space-2)' }}>
                  <h2
                    style={{
                      fontSize: '1.625rem',
                      fontWeight: 800,
                      margin: 0,
                      color: metrics.lowStockCount > 0 ? '#ea580c' : 'var(--ds-color-on-surface)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {metrics.lowStockCount}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', marginTop: '4px' }}>
                    {pluralize(metrics.lowStockCount, 'item', 'items')} at or below reorder threshold
                  </p>
                </div>
              </article>
            </section>

            {/* Split Information Layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--ds-space-6)',
              }}
            >
              {/* Left Column: Quick Navigation Modules with Lucide icons */}
              <section
                aria-label="Application modules"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}
              >
                {moduleCategories.map((cat) => (
                  <div
                    key={cat.title}
                    className="route-card"
                    style={{
                      padding: 'var(--ds-space-5)',
                      boxShadow: 'none',
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                    }}
                  >
                    <div style={{ marginBottom: 'var(--ds-space-3)' }}>
                      <h2
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          margin: 0,
                          color: 'var(--ds-color-on-surface)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {cat.title}
                      </h2>
                      <p
                        style={{
                          margin: '2px 0 0 0',
                          fontSize: '0.75rem',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        {cat.description}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 'var(--ds-space-3)',
                      }}
                    >
                      {cat.items.map((item) => {
                        const IconComponent = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              padding: 'var(--ds-space-3) var(--ds-space-4)',
                              backgroundColor: 'var(--ds-color-surface-container-low)',
                              borderRadius: 'var(--ds-radius-lg)',
                              border: '1px solid var(--ds-color-outline-variant)',
                              textDecoration: 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    padding: '6px',
                                    borderRadius: 'var(--ds-radius-md)',
                                    background: item.bgColor,
                                    color: item.color,
                                  }}
                                >
                                  <IconComponent size={18} />
                                </span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    color: 'var(--ds-color-on-surface)',
                                  }}
                                >
                                  {item.label}
                                </span>
                              </div>
                              <ChevronRight size={16} color="var(--ds-color-on-surface-variant)" />
                            </div>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                color: 'var(--ds-color-on-surface-variant)',
                                lineHeight: 1.4,
                              }}
                            >
                              {item.description}
                            </span>
                            {item.badge && (
                              <span
                                style={{
                                  alignSelf: 'flex-start',
                                  fontSize: '0.625rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--ds-radius-sm)',
                                  backgroundColor: item.badgeColor ? 'rgba(234, 88, 12, 0.1)' : 'var(--ds-color-surface-container)',
                                  color: item.badgeColor || 'var(--ds-color-on-surface-variant)',
                                  marginTop: '2px',
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </section>

              {/* Right Column: Inventory Attention & Financial Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
                {/* Low Stock Watchlist */}
                <section
                  aria-labelledby="low-stock-heading"
                  className="route-card"
                  style={{
                    padding: 'var(--ds-space-5)',
                    boxShadow: 'none',
                    backgroundColor: 'var(--ds-color-surface-container-lowest)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--ds-space-3)',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}
                  >
                    <div>
                      <h2
                        id="low-stock-heading"
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          margin: 0,
                          color: 'var(--ds-color-on-surface)',
                        }}
                      >
                        Low Stock Watchlist
                      </h2>
                      <p
                        style={{
                          margin: '2px 0 0 0',
                          fontSize: '0.75rem',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Items requiring restock attention
                      </p>
                    </div>
                    <Link
                      href="/app/stock"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--ds-color-primary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      View all <ArrowRight size={13} />
                    </Link>
                  </div>

                  {metrics.lowStockItems.length === 0 ? (
                    <div
                      style={{
                        padding: 'var(--ds-space-4)',
                        backgroundColor: 'rgba(22, 163, 74, 0.06)',
                        borderRadius: 'var(--ds-radius-lg)',
                        border: '1px solid rgba(22, 163, 74, 0.2)',
                        textAlign: 'center',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8125rem',
                          color: '#16a34a',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={16} /> All stock levels healthy
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                        No items are currently below their reorder threshold.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
                      {metrics.lowStockItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 'var(--ds-space-3)',
                            backgroundColor: 'var(--ds-color-surface-container-low)',
                            borderRadius: 'var(--ds-radius-md)',
                            borderLeft: `3px solid ${item.quantity === 0 ? '#dc2626' : '#ea580c'}`,
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display: 'block',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                color: 'var(--ds-color-on-surface)',
                              }}
                            >
                              {item.name}
                            </span>
                            {scope.isCombined && (
                              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                                {item.branchName}
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span
                              style={{
                                display: 'block',
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                color: item.quantity === 0 ? '#dc2626' : '#ea580c',
                              }}
                            >
                              {item.quantity} left
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                              Reorder at {item.reorderThreshold}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Financial Summary Card (Owner/Manager) */}
                {metrics.profitLoss && (
                  <section
                    aria-labelledby="financial-summary-heading"
                    className="route-card"
                    style={{
                      padding: 'var(--ds-space-5)',
                      boxShadow: 'none',
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--ds-space-3)' }}>
                      <div>
                        <h2
                          id="financial-summary-heading"
                          style={{
                            fontSize: '1rem',
                            fontWeight: 800,
                            margin: 0,
                            color: 'var(--ds-color-on-surface)',
                          }}
                        >
                          Monthly Cash Flow Breakdown
                        </h2>
                        <p
                          style={{
                            margin: '2px 0 0 0',
                            fontSize: '0.75rem',
                            color: 'var(--ds-color-on-surface-variant)',
                          }}
                        >
                          Accrued collections versus recorded expenses
                        </p>
                      </div>
                      <Link
                        href="/app/reports"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--ds-color-primary)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Reports <ArrowRight size={13} />
                      </Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Invoice Collections:</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(metrics.profitLoss.invoicePayments, currency)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Direct Income Entries:</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(metrics.profitLoss.income, currency)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          paddingTop: 'var(--ds-space-2)',
                          borderTop: '1px solid var(--ds-color-outline-variant)',
                        }}
                      >
                        <span>Total Collections:</span>
                        <span style={{ color: '#16a34a' }}>{formatMoney(metrics.profitLoss.revenue, currency)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginTop: 'var(--ds-space-2)' }}>
                        <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Operational Expenses:</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(metrics.profitLoss.expenses, currency)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Payroll Disbursed:</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(metrics.profitLoss.payroll, currency)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          paddingTop: 'var(--ds-space-2)',
                          borderTop: '1px solid var(--ds-color-outline-variant)',
                        }}
                      >
                        <span>Total Deductions:</span>
                        <span style={{ color: '#dc2626' }}>{formatMoney(metrics.profitLoss.totalExpenses, currency)}</span>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
