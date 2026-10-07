'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { FormEvent } from 'react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!emailPattern.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setStatus('Authentication is not connected yet.');
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-brand" aria-label="Operafrika home">
          <Image src="/icon.svg" alt="Operafrika" width={40} height={40} priority />
        </Link>
        <h1 className="auth-title">Log in</h1>
        <p className="auth-subtitle">Welcome back to Operafrika.</p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
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
          <button type="submit" className="auth-submit">
            Log in
          </button>
        </form>
        <p className="auth-alt">
          New to Operafrika?{' '}
          <Link href="/app/signup">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
