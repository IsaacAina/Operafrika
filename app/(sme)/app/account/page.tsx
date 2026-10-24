import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Role } from '@/generated/prisma/client';
import AccountDeletionCard from './account-deletion-card';

export const metadata: Metadata = {
  title: 'Account',
};

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="route-page-container">
        <h1 className="route-page-title">Account</h1>
        <p className="route-page-desc">No active session.</p>
        <Link href="/app" className="back-link">
          &larr; Back to your dashboard
        </Link>
      </main>
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    select: { name: true },
  });

  const activeOwners = await prisma.user.count({
    where: { businessId: user.businessId, role: Role.OWNER, deletedAt: null },
  });
  const isLastOwner = user.role === Role.OWNER && activeOwners <= 1;

  return (
    <main className="route-page-container">
      <h1 className="route-page-title">Account</h1>
      <p className="route-page-desc">
        Signed in as <strong>{user.email}</strong> ({user.role})
      </p>
      <p className="route-page-desc">Business: {business?.name ?? user.businessId}</p>
      <p className="route-page-desc">
        Email address {user.emailVerifiedAt ? 'verified' : 'not yet verified'}
      </p>

      <AccountDeletionCard
        email={user.email}
        isLastOwner={isLastOwner}
        businessName={business?.name ?? 'your business'}
      />

      <Link href="/app" className="back-link">
        &larr; Back to your dashboard
      </Link>
    </main>
  );
}
