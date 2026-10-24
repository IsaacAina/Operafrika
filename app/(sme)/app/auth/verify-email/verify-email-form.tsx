'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { FormEvent } from 'react';

const CODE_PATTERN = /^\d{6}$/;

export default function VerifyEmailForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 6));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!CODE_PATTERN.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone(true);
      setStatus(data.message ?? 'Your email address has been verified.');
      setTimeout(() => {
        window.location.href = '/app/onboarding';
      }, 1000);
    } catch {
      setStatus('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setStatus(null);
    setError(null);
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      });
      const data = await res.json();
      setStatus(
        data.message ??
          data.error ??
          'If your account needs verification, a new code has been sent.',
      );
    } catch {
      setStatus('Something went wrong. Please try again.');
    } finally {
      setResending(false);
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

        <h1 className="auth-title">Email verified</h1>
        {!done ? (
          <p className="auth-subtitle">
            We sent a 6-digit code to your email address. Enter it below to verify
            your account.
          </p>
        ) : null}

        {done ? (
          <div className="auth-form">
            <p className="auth-status" role="status">
              {status}
            </p>
            <Link href="/app/onboarding" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '0.875rem', borderRadius: '0.5rem' }}>
              Continue to dashboard
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-code">
                Verification code
              </label>
              <input
                className="auth-input"
                id="auth-code"
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                aria-invalid={Boolean(error)}
                value={code}
                onChange={(event) => handleCodeChange(event.target.value)}
              />
            </div>

            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}
            {status ? (
              <p className="auth-status" role="status">
                {status}
              </p>
            ) : null}

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Verify email'}
            </button>

            <p className="auth-alt">
              Didn&apos;t get the code?{' '}
              <button
                type="button"
                className="auth-link-button"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </p>
          </form>
        )}

        <p className="auth-alt">
          <Link href="/app">Skip for now</Link>
        </p>
      </div>
    </main>
  );
}
