'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function CancelDeletionForm({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'failed'>(
    'idle',
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleCancel() {
    setStatus('working');
    setMessage(null);

    try {
      const res = await fetch('/api/account/deletion/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('failed');
        setMessage(data.error ?? 'This link cannot be used.');
        return;
      }

      setStatus('done');
      setMessage(data.message ?? 'Your account is open again.');
    } catch {
      setStatus('failed');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-brand" aria-label="Operafrika home">
          <Image
            src="/icon.svg"
            alt="Operafrika"
            width={40}
            height={40}
            priority
          />
        </Link>

        <h1 className="auth-title">Keep your account</h1>

        {status === 'done' ? (
          <>
            <p className="auth-status" role="status">
              {message}
            </p>
            <p className="auth-alt">
              <Link href="/app/auth?view=login">Sign in</Link>
            </p>
          </>
        ) : status === 'failed' ? (
          <>
            <p className="auth-error" role="alert">
              {message}
            </p>
            <p className="auth-alt">
              <Link href="/app/auth?view=login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              You asked us to delete your account. Cancelling keeps it, and
              nothing is deleted.
            </p>

            <button
              type="button"
              className="auth-submit"
              onClick={handleCancel}
              disabled={status === 'working' || !token}
            >
              {status === 'working' ? 'Cancelling...' : 'Keep my account'}
            </button>

            {token ? null : (
              <p className="auth-error" role="alert">
                This link is missing its token. Open the link from your deletion
                email.
              </p>
            )}

            <p className="auth-alt">
              <Link href="/app/auth?view=login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
