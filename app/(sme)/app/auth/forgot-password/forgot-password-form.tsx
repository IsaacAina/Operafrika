'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { FormEvent } from 'react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm({
  initialEmail = '',
}: {
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(value: string): string | null {
    if (value.length === 0) return 'This field must not be empty';
    return emailPattern.test(value) ? null : 'Enter a valid email address';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const emailError = validate(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setStatus(
        'If an account exists with this email, you will receive a password reset link.',
      );
    } catch {
      setStatus('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
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

        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">
          Enter your email and we will send you a reset link.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">
              Email
            </label>
            <input
              className="auth-input"
              id="auth-email"
              type="email"
              name="email"
              autoComplete="email"
              aria-invalid={Boolean(error)}
              value={email}
              onChange={(event) => setEmail(event.target.value.trim().toLowerCase())}
              onBlur={() => setError(validate(email))}
            />
            {error ? (
              <span className="auth-error" role="alert">
                {error}
              </span>
            ) : null}
          </div>

          {status ? (
            <p className="auth-status" role="status">
              {status}
            </p>
          ) : null}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-alt">
          Remembered it?{' '}
          <Link href="/app/auth?view=login">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
