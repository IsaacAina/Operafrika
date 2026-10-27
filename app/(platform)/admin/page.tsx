import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getPlatformSession } from '@/lib/platform-auth'
import { prisma } from '@/lib/db'
import PlatformSignOutButton from './sign-out-button'

export const metadata: Metadata = {
  title: 'Admin Console',
}

export const dynamic = 'force-dynamic'

export default async function AdminConsolePage() {
  const session = await getPlatformSession()

  if (!session) {
    redirect('/platform/auth')
  }

  if (!session.canAccessAdminConsole) {
    if (session.canAccessFounderDashboard) {
      redirect('/founder')
    }
    redirect('/platform/auth')
  }

  const [businessCount, userCount, branchCount] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.branch.count(),
  ])

  return (
    <main className="route-page-container" style={{ alignItems: 'flex-start', textAlign: 'left', padding: 'var(--ds-space-8)' }}>
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-3)' }}>
            <Image
              src="/icon.svg"
              alt="Operafrika"
              width={40}
              height={40}
              priority
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="badge-tag badge-admin">Admin Dashboard</span>
                <span className="card-body">Signed in as {session.email}</span>
              </div>
              <PlatformSignOutButton />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
            <h1 className="route-page-title" style={{ textAlign: 'left' }}>Platform Admin Console</h1>
            <p className="route-page-desc" style={{ textAlign: 'left' }}>
              Operational overview
            </p>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--ds-space-4)' }}>
          <article className="route-card">
            <span className="badge-tag badge-admin">Businesses</span>
            <h2 className="card-heading">{businessCount}</h2>
            <p className="card-body">Active businesses on the platform</p>
          </article>
          <article className="route-card">
            <span className="badge-tag badge-admin">Users</span>
            <h2 className="card-heading">{userCount}</h2>
            <p className="card-body">Active SME users</p>
          </article>
          <article className="route-card">
            <span className="badge-tag badge-admin">Branches</span>
            <h2 className="card-heading">{branchCount}</h2>
            <p className="card-body">Total branches across all businesses</p>
          </article>
        </section>

        <section className="route-card" style={{ alignSelf: 'flex-start' }}>
          <h2 className="card-heading">Capabilities</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)', paddingLeft: 'var(--ds-space-4)' }}>
            <li className="card-body">Businesses, branches, users, subscriptions, usage, support messages</li>
            <li className="card-body">Onboarding status, system health</li>
            <li className="card-body">Currency correction (Platform Admin only)</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
