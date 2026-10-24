import type { Metadata } from 'next';
import ResetPasswordForm from './reset-password-form';

export const metadata: Metadata = {
  title: 'Choose a new password',
};

type ResetPasswordPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
