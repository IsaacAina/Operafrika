'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { FormEvent } from 'react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (name.trim().length === 0) {
      setError('Enter your name.');
      return;
    }
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start running every branch in one place.</p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span className="auth-label">Full name</span>
            <input
              className="auth-input"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
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
              autoComplete="new-password"
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
            Create account
          </button>
        </form>
        <p className="auth-alt">
          Already have an account?{' '}
          <Link href="/app/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
