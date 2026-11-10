import type { Metadata } from 'next'
import { Suspense } from 'react'
import PlatformLoginForm from './platform-login-form'

export const metadata: Metadata = {
  title: 'Platform Login',
}

export default function PlatformAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="route-page-container">
          <p className="card-body">Loading sign in...</p>
        </main>
      }
    >
      <PlatformLoginForm />
    </Suspense>
  )
}
