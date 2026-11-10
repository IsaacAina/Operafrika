import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { listRecentStockMovements, listStockItems } from '@/lib/stock'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import StockView from './stock-view'
import { ArrowLeft, Package, Store } from 'lucide-react'

export const metadata: Metadata = { title: 'Stock & Inventory' }

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[] }>
}) {
  const user = await getRequestUser()
  if (!user) redirect('/app/auth?view=login')
  if (!user.emailVerified) redirect('/app/auth/verify-email')

  const params = await searchParams
  const branchParam =
    typeof params.branch === 'string' ? params.branch : undefined
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

      const items = await listStockItems(tx, {
        businessId: user.businessId,
        branchIds: scope.branchIds,
      })

      const movements = await listRecentStockMovements(tx, scope.branchIds, 25)

      return {
        onboarding: false as const,
        business,
        scope,
        items,
        movements,
      }
    },
  )

  if (data.onboarding) {
    redirect('/app/onboarding')
  }

  const { business, scope, items, movements } = data
  const currency = business?.currency ?? 'NGN'

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
                  <Package size={13} color="var(--ds-color-primary)" />
                  <span>Stock &amp; Inventory &middot; <strong>{currency}</strong></span>
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
            <h1 className="subpage-mobile-title">Stock &amp; Inventory</h1>
          </div>
        </header>

        {/* Page Title & Branch Filter Bar (Hidden on mobile if single-branch to prevent blank container) */}
        <div className={scope.canViewAllBranches && scope.branches.length > 1 ? "subpage-title-bar" : "subpage-title-bar subpage-title-bar-single"}>
            <div className="subpage-title-block subpage-desktop-title-block">
              <h1 className="subpage-title-heading">
                Inventory &amp; Stock Levels
              </h1>
              <p className="subpage-title-desc">
                Track items, costs, reorder thresholds, and log stock-in / stock-out movements
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
                  href="/app/stock"
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
                      href={`/app/stock?branch=${b.id}`}
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

        {/* Interactive Stock View */}
        <StockView
          initialItems={items}
          initialMovements={movements}
          branches={scope.branches}
          currentBranchId={scope.selectedBranch?.id ?? null}
          userRole={user.role}
          currency={currency}
        />
      </div>
    </main>
  )
}
