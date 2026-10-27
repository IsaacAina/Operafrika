'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PlatformSignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/platform/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      // Ignore errors and still redirect to login
    } finally {
      router.push('/platform/auth')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
