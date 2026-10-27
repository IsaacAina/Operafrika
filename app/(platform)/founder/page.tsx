import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getPlatformSession } from '@/lib/platform-auth'
import { prisma } from '@/lib/db'
import PlatformSignOutButton from './sign-out-button'

export const metadata: Metadata = {
  title: 'Founder Dashboard',
}

export const dynamic = 'force-dynamic'

export default async function FounderDashboardPage() {
  const session = await getPlatformSession()

  if (!session) {
    redirect('/platform/auth')
  }

  if (!session.canAccessFounderDashboard) {
    if (session.canAccessAdminConsole) {
      redirect('/admin')
    }
    redirect('/platform/auth')
  }

  const [businessCount, userCount] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ])

  const businessesByPlan = await prisma.business.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      subscription: {
        select: { planName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

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
                <span className="badge-tag badge-founder">Founder Dashboard</span>
                <span className="card-body">Signed in as {session.email}</span>
              </div>
              <PlatformSignOutButton />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
            <h1 className="route-page-title" style={{ textAlign: 'left' }}>Founder Dashboard</h1>
            <p className="route-page-desc" style={{ textAlign: 'left' }}>
              Company-level overview
            </p>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--ds-space-4)' }}>
          <article className="route-card">
            <span className="badge-tag badge-founder">Signups (active businesses)</span>
            <h2 className="card-heading">{businessCount}</h2>
            <p className="card-body">Active businesses</p>
          </article>
          <article className="route-card">
            <span className="badge-tag badge-founder">Active users</span>
            <h2 className="card-heading">{userCount}</h2>
            <p className="card-body">Active SME users</p>
          </article>
        </section>

        <section className="route-card" style={{ width: '100%' }}>
          <h2 className="card-heading">Businesses by plan (recent)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
            {businessesByPlan.map((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--ds-space-2) 0', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                <span className="card-body">{b.name}</span>
                <span className="card-body">{b.subscription?.planName ?? 'Free (Test Period)'}</span>
              </div>
            ))}
            {businessesByPlan.length === 0 ? <p className="card-body">No businesses yet</p> : null}
          </div>
        </section>
      </div>
    </main>
  )
}
