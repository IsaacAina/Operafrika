import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { Role } from '@prisma/client'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import AccountView from './account-view'
import { User, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'My Account | Operafrika',
  description: 'Profile settings, credentials, and data privacy controls',
}

export default async function AccountPage() {
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
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
          onboardingCompletedAt: true,
          branchAccess: {
            include: { branch: { select: { name: true } } },
          },
        },
      })

      if (!dbUser?.onboardingCompletedAt) {
        return { onboarding: true as const }
      }

      const business = await tx.business.findUnique({
        where: { id: user.businessId },
        select: { name: true, currency: true },
      })

      const activeOwners = await tx.user.count({
        where: {
          businessId: user.businessId,
          role: Role.OWNER,
          deletedAt: null,
        },
      })

      return {
        onboarding: false as const,
        business,
        user: dbUser,
        isLastOwner: user.role === 'OWNER' && activeOwners <= 1,
      }
    }
  )

  if (data.onboarding) {
    redirect('/app/onboarding')
  }

  const assignedBranch = data.user?.branchAccess[0]?.branch?.name ?? null

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
                  <User size={13} color="var(--ds-color-primary)" />
                  <span>Account &amp; Security Preferences &middot; <strong>{data.business?.currency ?? 'NGN'}</strong></span>
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
            <h1 className="subpage-mobile-title">My Account &amp; Security</h1>
          </div>
        </header>

        {data.user && (
          <AccountView
            user={{
              id: data.user.id,
              email: data.user.email,
              role: data.user.role,
              isEmailVerified: Boolean(data.user.emailVerifiedAt),
              createdAt: data.user.createdAt,
              assignedBranchName: assignedBranch,
              businessName: data.business?.name || 'Operafrika Business',
              isLastOwner: data.isLastOwner,
            }}
          />
        )}
      </div>
    </main>
  )
}
