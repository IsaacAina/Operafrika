'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { useDeleteAccount } from '@/lib/auth-queries';

interface AccountDeletionCardProps {
  email: string;
  /** True when this account is the only owner of its business. The business
   * is deleted with the account in that case. */
  isLastOwner: boolean;
  businessName: string;
}

export default function AccountDeletionCard({
  email,
  isLastOwner,
  businessName,
}: AccountDeletionCardProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const deleteMutation = useDeleteAccount();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWarning(null);

    if (confirmation.trim().toLowerCase() !== email.trim().toLowerCase()) {
      setError('Type your email address exactly to confirm.');
      return;
    }

    deleteMutation.mutate(undefined, {
      onSuccess: (data) => {
        setResult(data.message ?? 'Your account is scheduled for deletion.');
        setWarning(data.warning ?? null);
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Something went wrong. Please try again.');
        }
      },
    });
  }

  if (result) {
    return (
      <section className="account-card">
        <h2 className="account-card-title">Account scheduled for deletion</h2>
        <p className="account-card-body">
          {result} You have been signed out. Check your email for the link that
          cancels the deletion.
        </p>
        {warning ? (
          <p className="auth-error" role="alert">
            {warning}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="account-card account-card-danger">
      <h2 className="account-card-title">Delete account</h2>
      <p className="account-card-body">
        Deleting your account signs you out everywhere and schedules your data
        for permanent deletion after a grace period. You can cancel during that
        window from the link in the email we send you.
      </p>
      {isLastOwner ? (
        <p className="account-card-warning">
          You are the only owner of {businessName}. The business and every
          record inside it will be deleted with your account.
        </p>
      ) : null}

      {open ? (
        <form className="account-form" onSubmit={handleSubmit} noValidate>
          <label className="account-label" htmlFor="account-confirm">
            Type <strong>{email}</strong> to confirm
          </label>
          <input
            className="account-input"
            id="account-confirm"
            type="email"
            name="confirmation"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          {warning ? (
            <p className="auth-status" role="status">
              {warning}
            </p>
          ) : null}

          <div className="account-actions">
            <button
              type="submit"
              className="account-button-danger"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Scheduling...' : 'Delete my account'}
            </button>
            <button
              type="button"
              className="account-button-quiet"
              onClick={() => {
                setOpen(false);
                setConfirmation('');
                setError(null);
                setWarning(null);
              }}
              disabled={deleteMutation.isPending}
            >
              Keep my account
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="account-button-danger"
          onClick={() => setOpen(true)}
        >
          Delete account
        </button>
      )}
    </section>
  );
}
