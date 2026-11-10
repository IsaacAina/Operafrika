import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { listInvoices } from '@/lib/sales'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import SalesView from './sales-view'
import { InvoiceStatus } from '@prisma/client'
import { ArrowLeft, Receipt, Store } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sales & Invoicing | Operafrika',
  description: 'Issue sales invoices, track retail transactions, and manage payments',
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[]; page?: string; search?: string; status?: string }>
}) {
  const user = await getRequestUser()
  if (!user) redirect('/app/auth?view=login')
  if (!user.emailVerified) redirect('/app/auth/verify-email')

  const params = await searchParams
  const branchParam = typeof params.branch === 'string' ? params.branch : undefined
  const page = parseInt(typeof params.page === 'string' ? params.page : '1', 10)
  const search = typeof params.search === 'string' ? params.search : undefined
  const statusParam = typeof params.status === 'string' ? params.status : undefined
  const status =
    statusParam === 'PAID' || statusParam === 'UNPAID' || statusParam === 'PARTIAL'
      ? (statusParam as InvoiceStatus)
      : undefined

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

      // Fetch paginated invoices
      const invoiceResult = await listInvoices(tx, {
        businessId: user.businessId,
        branchIds: scope.branchIds,
        search,
        status,
        page,
        pageSize: 15,
      })

      // Available stock items for POS builder
      const stockItems = await tx.stockItem.findMany({
        where: { branchId: { in: scope.branchIds } },
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          sellingPrice: true,
          branchId: true,
        },
        orderBy: { name: 'asc' },
      })

      // Available customers for invoice linking
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

      // Sales Metrics calculation
      const now = new Date()
      const todayStart = startOfDay(now)
      const tomorrow = addDays(todayStart, 1)

      const [todayAgg, allInvoices] = await Promise.all([
        tx.invoice.aggregate({
          where: {
            branchId: { in: scope.branchIds },
            createdAt: { gte: todayStart, lt: tomorrow },
          },
          _sum: { total: true },
          _count: { _all: true },
        }),
        tx.invoice.findMany({
          where: { branchId: { in: scope.branchIds } },
          select: {
            total: true,
            paymentAmount: true,
            status: true,
          },
        }),
      ])

      const totalInvoiced = allInvoices.reduce((acc, inv) => acc + Number(inv.total), 0)
      const cashCollected = allInvoices.reduce((acc, inv) => {
        if (inv.status === InvoiceStatus.PAID) {
          return acc + Number(inv.paymentAmount ?? inv.total)
        }
        if (inv.status === InvoiceStatus.PARTIAL) {
          return acc + Number(inv.paymentAmount ?? 0)
        }
        return acc
      }, 0)
      const outstandingBalance = Math.max(0, totalInvoiced - cashCollected)

      return {
        onboarding: false as const,
        business,
        scope,
        invoiceResult,
        stockItems: stockItems.map((si) => ({
          ...si,
          sellingPrice: Number(si.sellingPrice),
        })),
        customers,
        metrics: {
          todaySales: Number(todayAgg._sum.total ?? 0),
          todayCount: todayAgg._count._all,
          totalInvoiced,
          cashCollected,
          outstandingBalance,
          totalInvoices: allInvoices.length,
        },
      }
    },
  )

  if (data.onboarding) {
    redirect('/app/onboarding')
  }

  const { business, scope, invoiceResult, stockItems, customers, metrics } = data
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
                  <Receipt size={13} color="var(--ds-color-primary)" />
                  <span>Sales &amp; Invoicing &middot; <strong>{currency}</strong></span>
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
            <h1 className="subpage-mobile-title">Sales &amp; Invoicing</h1>
          </div>
        </header>

        {/* Page Title & Branch Filter Bar (Hidden on mobile if single-branch to prevent blank container) */}
        <div className={scope.canViewAllBranches && scope.branches.length > 1 ? "subpage-title-bar" : "subpage-title-bar subpage-title-bar-single"}>
            <div className="subpage-title-block subpage-desktop-title-block">
              <h1 className="subpage-title-heading">
                Invoices &amp; Point of Sale
              </h1>
              <p className="subpage-title-desc">
                Issue walk-in invoices, record line items, and manage payment settlements
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
                  href="/app/sales"
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
                      href={`/app/sales?branch=${b.id}`}
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

        {/* Interactive Sales View */}
        <SalesView
          initialInvoices={invoiceResult.invoices}
          totalCount={invoiceResult.totalCount}
          currentPage={invoiceResult.page}
          pageSize={invoiceResult.pageSize}
          totalPages={invoiceResult.totalPages}
          metrics={metrics}
          branches={scope.branches}
          selectedBranchId={scope.selectedBranch?.id}
          currency={currency}
          userRole={user.role}
          stockItems={stockItems}
          customers={customers}
        />
      </div>
    </main>
  )
}
