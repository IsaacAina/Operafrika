'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';

export type AuthView = 'login' | 'signup';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_MESSAGE = 'This field must not be empty';

type AuthCardProps = {
  view: AuthView;
};

type TouchedState = {
  name: boolean;
  email: boolean;
  password: boolean;
};

function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return EMPTY_MESSAGE;
  if (trimmed.length < 2) return 'Name must be at least 2 characters.';
  if (trimmed.split(/\s+/).length < 2) {
    return 'Enter at least two names separated by a space.';
  }
  return null;
}

function validateEmail(value: string): string | null {
  if (value.length === 0) return EMPTY_MESSAGE;
  return emailPattern.test(value) ? null : 'Enter a valid email address';
}

function validatePassword(value: string): string | null {
  if (value.length === 0) return EMPTY_MESSAGE;
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

function visibleError(
  error: string | null,
  touched: boolean,
  live: boolean,
): string | null {
  if (!error) return null;
  if (error === EMPTY_MESSAGE) return touched ? error : null;
  return touched || live ? error : null;
}

type FieldProps = {
  label: string;
  type: string;
  name: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | null;
  live: boolean;
  touched: boolean;
  hint?: string;
  inputRef?: RefObject<HTMLInputElement>;
};

function AuthField({
  label,
  type,
  name,
  autoComplete,
  value,
  onChange,
  onBlur,
  error,
  live,
  touched,
  hint,
  inputRef,
}: FieldProps) {
  const message = visibleError(error, touched, live);
  const showError = Boolean(message);
  const showHint = !showError && Boolean(hint) && value.length > 0;

  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={`auth-${name}`}>
        {label}
      </label>
      <input
        className="auth-input"
        id={`auth-${name}`}
        type={type}
        name={name}
        autoComplete={autoComplete}
        ref={inputRef}
        aria-invalid={showError}
        aria-describedby={
          showError
            ? `auth-${name}-error`
            : hint
              ? `auth-${name}-hint`
              : undefined
        }
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {showError ? (
        <span className="auth-error" id={`auth-${name}-error`} role="alert">
          {message}
        </span>
      ) : null}
      {hint ? (
        <span className="auth-hint" id={`auth-${name}-hint`} role="status">
          {showHint ? hint : null}
        </span>
      ) : null}
    </div>
  );
}

export default function AuthCard({ view }: AuthCardProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<TouchedState>({
    name: false,
    email: false,
    password: false,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsSignal, setTermsSignal] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const isSignup = view === 'signup';

  const nameError = isSignup ? validateName(name) : null;
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const formValid = !nameError && !emailError && !passwordError;
  const canSubmit = formValid && (!isSignup || termsAccepted);

  function markTouched(field: keyof TouchedState) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function focusFirstInvalid() {
    if (isSignup && nameError) {
      nameRef.current?.focus();
      return;
    }
    if (emailError) {
      emailRef.current?.focus();
      return;
    }
    if (passwordError) {
      passwordRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setTouched({ name: true, email: true, password: true });

    if (!formValid) {
      focusFirstInvalid();
      return;
    }

    if (!termsAccepted) {
      setTermsSignal(
        'Please accept the terms and conditions to create your account.',
      );
      termsRef.current?.focus();
      return;
    }

    setTermsSignal(null);
    setStatus('Authentication is not connected yet.');
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

        {isSignup ? (
          <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">
              Start running every branch in one place.
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-title">Log in</h1>
            <p className="auth-subtitle">Welcome back to Operafrika.</p>
          </>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isSignup ? (
            <AuthField
              label="Full name"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={setName}
              onBlur={() => markTouched('name')}
              error={nameError}
              touched={touched.name}
              live
              inputRef={nameRef}
            />
          ) : null}
          <AuthField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setTermsSignal(null);
            }}
            onBlur={() => markTouched('email')}
            error={emailError}
            touched={touched.email}
            live={isSignup}
            inputRef={emailRef}
          />
          <AuthField
            label="Password"
            type="password"
            name="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={setPassword}
            onBlur={() => markTouched('password')}
            error={passwordError}
            touched={touched.password}
            live={false}
            inputRef={passwordRef}
            hint={
              isSignup ? 'Your password must be at least 8 characters.' : undefined
            }
          />

          {isSignup ? (
            <>
              <div className="auth-terms">
                <input
                  type="checkbox"
                  id="auth-terms"
                  name="terms"
                  ref={termsRef}
                  aria-required="true"
                  aria-describedby="auth-terms-hint"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked);
                    if (event.target.checked) setTermsSignal(null);
                  }}
                />
                <label htmlFor="auth-terms">
                  I accept the terms and conditions
                </label>
              </div>
              <p className="auth-hint" id="auth-terms-hint">
                You must accept the terms and conditions before you can create
                your account.
              </p>
              <p className="auth-terms-links">
                Read the{' '}
                <Link href="/?view=terms">terms of service</Link> and{' '}
                <Link href="/?view=privacy">privacy policy</Link>.
              </p>
              {termsSignal ? (
                <p className="auth-error" role="alert">
                  {termsSignal}
                </p>
              ) : null}
            </>
          ) : null}

          {status ? (
            <p className="auth-status" role="status">
              {status}
            </p>
          ) : null}

          <p className="visually-hidden" id="auth-submit-notice" role="status">
            {canSubmit
              ? 'All fields are complete. This button is ready.'
              : `Complete every field${
                  isSignup ? ' and accept the terms and conditions' : ''
                } to enable this button.`}
          </p>
          <button
            type="submit"
            className={`auth-submit${canSubmit ? '' : ' auth-submit-disabled'}`}
            aria-disabled={!canSubmit}
            aria-describedby="auth-submit-notice"
          >
            {isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="auth-alt">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <Link href="/app/auth?view=login">Log in</Link>
            </>
          ) : (
            <>
              New to Operafrika?{' '}
              <Link href="/app/auth?view=signup">Create an account</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
