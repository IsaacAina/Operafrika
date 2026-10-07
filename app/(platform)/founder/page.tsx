import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founder Dashboard',
};

export default function FounderDashboardPage() {
  return (
    <main className="route-page-container">
      <h1 className="route-page-title">Founder Dashboard (/founder)</h1>
      <p className="route-page-desc">
        Route group for internal platform accounts with Founder Dashboard access.
      </p>
      <Link href="/" className="back-link">
        &larr; Back to Home
      </Link>
    </main>
  );
}
