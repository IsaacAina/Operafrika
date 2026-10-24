'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { FormEvent } from 'react';

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function validate(value: string): string | null {
    if (value.trim().length === 0) return 'This field must not be empty';
    if (value.length < 8) return 'Password must be at least 8 characters.';
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const passwordError = validate(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone(true);
      setStatus('Your password has been reset.');
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

        <h1 className="auth-title">Choose a new password</h1>
        <p className="auth-subtitle">
          Enter a new password for your account.
        </p>

        {done ? (
          <p className="auth-status" role="status">
            Your password has been reset.{' '}
            <Link href="/app/auth?view=login">Log in</Link>
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                New password
              </label>
              <input
                className="auth-input"
                id="auth-password"
                type="password"
                name="password"
                autoComplete="new-password"
                aria-invalid={Boolean(error)}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-confirm">
                Confirm password
              </label>
              <input
                className="auth-input"
                id="auth-confirm"
                type="password"
                name="confirm"
                autoComplete="new-password"
                aria-invalid={Boolean(error)}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
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
              {submitting ? 'Saving...' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="auth-alt">
          <Link href="/app/auth?view=login">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
