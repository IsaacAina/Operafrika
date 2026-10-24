import type { Metadata } from 'next';
import ForgotPasswordForm from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset your password',
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ email?: string | string[] }>;
};

function resolveEmail(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { email: rawEmail } = await searchParams;
  const email = resolveEmail(rawEmail);
  return <ForgotPasswordForm initialEmail={email} />;
}

