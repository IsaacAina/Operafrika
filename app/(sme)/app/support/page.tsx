import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import SupportView, { type UserSupportTicket } from './support-view'
import { ArrowLeft, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Help & Support | Operafrika',
  description: 'Knowledgebase, FAQs, and direct platform support for Nigerian SMEs',
}

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
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
          onboardingCompletedAt: true,
          business: {
            select: {
              name: true,
              currency: true,
            },
          },
        },
      })

      if (!dbUser?.onboardingCompletedAt) {
        return { onboarding: true as const, initialTickets: [] }
      }

      const rawTickets = await tx.$queryRaw<
        Array<{
          id: string
          message: string
          resolved: boolean
          createdAt: Date | string
          adminReply: string | null
          adminRepliedAt: Date | string | null
          adminEmail: string | null
        }>
      >`SELECT id, message, resolved, "createdAt", "adminReply", "adminRepliedAt", "adminEmail"
          FROM "SupportMessage"
         WHERE "userId" = ${user.userId}
         ORDER BY "createdAt" DESC
         LIMIT 30`

      const initialTickets: UserSupportTicket[] = rawTickets.map((t) => ({
        id: t.id,
        message: t.message,
        resolved: t.resolved,
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
        adminReply: t.adminReply ?? null,
        adminRepliedAt: t.adminRepliedAt ? new Date(t.adminRepliedAt).toISOString() : null,
        adminEmail: t.adminEmail ?? null,
      }))

      return {
        onboarding: false as const,
        businessName: dbUser.business.name,
        currency: dbUser.business.currency,
        initialTickets,
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
          maxWidth: '1040px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-6)',
        }}
      >
        {/* Unified Responsive SME Header */}
        <header role="banner" style={{ width: '100%' }}>
          {/* Desktop Header (> 640px) */}
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
                  {data.businessName || 'Operafrika Business'}
                </span>
                <span className="subpage-header-subtitle-text">
                  <HelpCircle size={13} color="var(--ds-color-primary)" />
                  <span>Help &amp; Support Knowledgebase &middot; <strong>{data.currency ?? 'NGN'}</strong></span>
                </span>
              </div>
            </div>

            {/* Right Side Header: Notifications & Round Avatar Menu */}
            <div className="subpage-header-right">
              <NotificationCenter />
              <UserAvatarMenu
                name={data.businessName}
                email={user.email}
                role={user.role}
              />
            </div>
          </div>

          {/* Mobile Subpage Header (<= 640px) */}
          <div className="subpage-mobile-header">
            <Link
              href="/app"
              aria-label="Back to dashboard"
              title="Back to dashboard"
              className="subpage-header-btn"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="subpage-mobile-title">Help &amp; Support</h1>
          </div>
        </header>

        {/* Support Hub Main Content */}
        <SupportView
          initialTickets={data.initialTickets}
          userEmail={user.email}
          userRole={user.role}
          businessName={data.businessName}
        />
      </div>
    </main>
  )
}
