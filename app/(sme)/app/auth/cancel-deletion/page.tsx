import type { Metadata } from 'next';
import CancelDeletionForm from './cancel-deletion-form';

export const metadata: Metadata = {
  title: 'Keep your account',
};

export default async function CancelDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = typeof rawToken === 'string' ? rawToken : '';

  return <CancelDeletionForm token={token} />;
}
