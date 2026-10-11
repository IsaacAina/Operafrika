import type { Metadata } from 'next';
import AuthCard, { type AuthView } from './auth-forms';

type AuthPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

function resolveAuthView(raw: string | string[] | undefined): AuthView {
  const view = Array.isArray(raw) ? raw[0] : raw;
  return view === 'signup' ? 'signup' : 'login';
}

export async function generateMetadata({
  searchParams,
}: AuthPageProps): Promise<Metadata> {
  const { view: rawView } = await searchParams;
  const view = resolveAuthView(rawView);
  return {
    title: view === 'signup' ? 'Create account' : 'Log in',
  };
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { view: rawView } = await searchParams;
  const view = resolveAuthView(rawView);
  return <AuthCard key={view} view={view} />;
}
