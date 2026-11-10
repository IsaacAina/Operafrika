import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { listBranches, type BranchActor } from '@/lib/branches'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import BranchesView from './branches-view'
import { Store, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Branch Management | Operafrika',
  description: 'Physical store locations, address configuration, and manager deployment',
}

export default async function BranchesPage() {
  const user = await getRequestUser()
  if (!user) redirect('/app/auth?view=login')
  if (!user.emailVerified) redirect('/app/auth/verify-email')

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

      const actor: BranchActor = {
        userId: user.userId,
        role: user.role,
        businessId: user.businessId,
        email: user.email,
      }

      const branches = await listBranches(tx, actor)

      return {
        onboarding: false as const,
        business,
        branches,
      }
    }
  )

  if (data.onboarding) {
    redirect('/app/onboarding')
  }

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
                  <Store size={13} color="var(--ds-color-primary)" />
                  <span>Branch Network &middot; <strong>{data.business?.currency ?? 'NGN'}</strong></span>
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
            <h1 className="subpage-mobile-title">Branch Locations</h1>
          </div>
        </header>

        <BranchesView
          initialBranches={data.branches}
          userRole={user.role}
          userEmail={user.email}
          businessName={data.business?.name || 'Operafrika Business'}
        />
      </div>
    </main>
  )
}
