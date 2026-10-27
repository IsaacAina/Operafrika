import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getRequestUser } from '@/lib/request-user';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import SignOutButton from './sign-out-button';

export const metadata: Metadata = {
  title: 'Dashboard',
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

  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    select: { name: true, currency: true },
  });

  const [branchCount, invoiceCount, stockItemCount] = await Promise.all([
    prisma.branch.count({ where: { businessId: user.businessId } }),
    prisma.invoice.count({ where: { branch: { businessId: user.businessId } } }),
    prisma.stockItem.count({ where: { branch: { businessId: user.businessId } } }),
  ]);

  const navItems = [
    { href: '/app/sales', label: 'Sales & Invoices', roles: ['OWNER', 'MANAGER', 'STAFF'] },
    { href: '/app/customers', label: 'Customers', roles: ['OWNER', 'MANAGER', 'STAFF'] },
    { href: '/app/stock', label: 'Stock', roles: ['OWNER', 'MANAGER', 'STAFF'] },
    { href: '/app/income', label: 'Income', roles: ['OWNER', 'MANAGER'] },
    { href: '/app/expenses', label: 'Expenses', roles: ['OWNER', 'MANAGER'] },
    { href: '/app/staff', label: 'Staff & Payroll', roles: ['OWNER'] },
    { href: '/app/reports', label: 'Reports', roles: ['OWNER', 'MANAGER', 'STAFF'] },
    { href: '/app/branches', label: 'Branches', roles: ['OWNER'] },
    { href: '/app/settings', label: 'Settings', roles: ['OWNER'] },
  ].filter((item) => item.roles.includes(user.role));

  return (
    <main className="route-page-container" style={{ alignItems: 'flex-start', textAlign: 'left', padding: 'var(--ds-space-8)' }}>
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-3)' }}>
            <Image
              src="/icon.svg"
              alt="Operafrika"
              width={40}
              height={40}
              priority
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="card-body">Signed in as <strong>{user.email}</strong></span>
                <span className="card-body">{business?.name} • {user.role}</span>
              </div>
              <SignOutButton />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
            <h1 className="route-page-title" style={{ textAlign: 'left' }}>Dashboard</h1>
            <p className="route-page-desc" style={{ textAlign: 'left' }}>
              Business operating system for {business?.name}
            </p>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--ds-space-4)' }}>
          <article className="route-card">
            <span className="badge-tag">Branches</span>
            <h2 className="card-heading">{branchCount}</h2>
            <p className="card-body">Active branches</p>
          </article>
          <article className="route-card">
            <span className="badge-tag">Invoices</span>
            <h2 className="card-heading">{invoiceCount}</h2>
            <p className="card-body">Total invoices</p>
          </article>
          <article className="route-card">
            <span className="badge-tag">Stock Items</span>
            <h2 className="card-heading">{stockItemCount}</h2>
            <p className="card-body">Items in stock</p>
          </article>
        </section>

        <section className="route-card">
          <h2 className="card-heading">Quick Access</h2>
          <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-4)' }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="btn btn-outline"
                style={{ textAlign: 'center', justifyContent: 'center' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <Link href="/" className="back-link">
          &larr; Back to Home
        </Link>
      </div>
    </main>
  );
}
