import Link from 'next/link';
import type { Metadata } from 'next';
import { getRequestUser } from '@/lib/request-user';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import SignOutButton from './sign-out-button';

export const metadata: Metadata = {
  title: 'SME Application',
};

export default async function SmeAppPage() {
  const user = await getRequestUser();

  if (!user) {
    redirect('/app/auth?view=login');
  }

  if (!user.emailVerified) {
    redirect('/app/auth/verify-email');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { onboardingCompletedAt: true },
  });

  if (!dbUser?.onboardingCompletedAt) {
    redirect('/app/onboarding');
  }

  return (
    <main className="route-page-container">
      <h1 className="route-page-title">SME Application (/app)</h1>
      <p className="route-page-desc">
        Route group for business owners, managers, and staff.
      </p>
      <div>
        <p className="route-page-desc">
          Signed in as <strong>{user.email}</strong> ({user.role})
        </p>
        <p className="route-page-desc">Business: {user.businessId}</p>
        <p className="route-page-desc">
          Email address verified
        </p>
        <SignOutButton />
      </div>
      <Link href="/" className="back-link">
        &larr; Back to Home
      </Link>
    </main>
  );
}
