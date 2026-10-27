import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SignOutButton from '../sign-out-button'

export const metadata: Metadata = { title: 'Income' }

export default async function Page() {
  const user = await getRequestUser()
  if (!user) redirect('/app/auth?view=login')
  if (!user.emailVerified) redirect('/app/auth/verify-email')

  return (
    <main className=\"route-page-container\" style={{ alignItems: 'flex-start', textAlign: 'left', padding: 'var(--ds-space-8)' }}>
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-3)' }}>
            <Image src=\"/icon.svg\" alt=\"Operafrika\" width={40} height={40} priority />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className=\"card-body\">Signed in as <strong>{user.email}</strong></span>
                <span className=\"card-body\">{user.role}</span>
              </div>
              <SignOutButton />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
            <h1 className=\"route-page-title\" style={{ textAlign: 'left' }}>Income</h1>
            <p className=\"route-page-desc\" style={{ textAlign: 'left' }}>Manage your business</p>
          </div>
        </header>
        <section className=\"route-card\"><h2 className=\"card-heading\">Coming Soon</h2><p className=\"card-body\">This section will be available soon.</p></section>
        <Link href=\"/app\" className=\"back-link\">&larr; Back to Dashboard</Link>
      </div>
    </main>
  )
}
