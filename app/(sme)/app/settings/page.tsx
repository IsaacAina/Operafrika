import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { getBusinessSettings, type SettingsActor, type BusinessSettingsDetail } from '@/lib/settings'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import SettingsView from './settings-view'
import { Settings, ArrowLeft, ShieldAlert } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Business Settings | Operafrika',
  description: 'Company profile, currency info, and operational preferences',
}

export default async function SettingsPage() {
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

      if (user.role === 'STAFF') {
        return {
          onboarding: false as const,
          business,
          settings: null as BusinessSettingsDetail | null,
        }
      }

      const actor: SettingsActor = {
        userId: user.userId,
        role: user.role,
        businessId: user.businessId,
        email: user.email,
      }

      const settings = await getBusinessSettings(tx, actor)

      return {
        onboarding: false as const,
        business,
        settings,
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
                  <Settings size={13} color="var(--ds-color-primary)" />
                  <span>Business Settings &middot; <strong>{data.business?.currency ?? 'NGN'}</strong></span>
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
            <h1 className="subpage-mobile-title">Business Settings</h1>
          </div>
        </header>

        {/* Staff Role Access Barrier (Permission Matrix rule) */}
        {user.role === 'STAFF' ? (
          <div
            style={{
              padding: 'var(--ds-space-8)',
              borderRadius: 'var(--ds-radius-xl)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 'var(--ds-space-4)',
              marginTop: 'var(--ds-space-4)',
            }}
          >
            <ShieldAlert size={48} style={{ color: '#dc2626' }} />
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--ds-font-size-xl)',
                fontWeight: 700,
                color: 'var(--ds-color-on-surface)',
              }}
            >
              Access Restricted
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: '560px',
                fontSize: 'var(--ds-font-size-sm)',
                lineHeight: 1.6,
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Under Operafrika&apos;s authorization policy, Staff accounts are not permitted to view or manage corporate
              business settings. Please contact your Branch Manager or Business Owner if you require assistance.
            </p>
            <Link
              href="/app"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--ds-space-2)',
                padding: 'var(--ds-space-3) var(--ds-space-5)',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 'var(--ds-font-size-sm)',
                textDecoration: 'none',
              }}
            >
              &larr; Return to Dashboard
            </Link>
          </div>
        ) : data.settings ? (
          <SettingsView
            initialSettings={data.settings}
            userRole={user.role}
            userEmail={user.email}
          />
        ) : null}
      </div>
    </main>
  )
}
