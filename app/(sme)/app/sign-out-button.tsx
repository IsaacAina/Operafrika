'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useLogout } from '@/lib/auth-queries';

export default function SignOutButton() {
  const logoutMutation = useLogout();
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Sign out could not be completed. Please contact support.');
      }
    } finally {
      window.location.href = '/app/auth?view=login';
    }
  }

  return (
    <div>
      <button
        type="button"
        className="auth-link-button"
        onClick={handleSignOut}
        disabled={logoutMutation.isPending}
      >
        {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
      </button>
      {error ? <p className="auth-error">{error}</p> : null}
    </div>
  );
}
