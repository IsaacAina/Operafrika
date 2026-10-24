import type { Metadata } from 'next';
import { HydrationBoundary } from '@tanstack/react-query';
import { createClientHydrationBoundary } from '@/lib/auth-hydrate';
import AuthCard, { type AuthView } from './auth-forms';

type AuthPageProps = {
  searchParams: Promise<{ view?: string | string[]; next?: string | string[] }>;
};

function resolveAuthView(raw: string | string[] | undefined): AuthView {
  const view = Array.isArray(raw) ? raw[0] : raw;
  return view === 'signup' ? 'signup' : 'login';
}

function resolveNext(raw: string | string[] | undefined): string | null {
  const next = Array.isArray(raw) ? raw[0] : raw;
  return next ?? null;
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
  const { view: rawView, next: rawNext } = await searchParams;
  const view = resolveAuthView(rawView);
  const next = resolveNext(rawNext);
  const boundary = await createClientHydrationBoundary();

  return (
    <HydrationBoundary state={boundary.state}>
      <AuthCard key={view} view={view} next={next} />
    </HydrationBoundary>
  );
}

