import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Console',
};

export default function AdminConsolePage() {
  return (
    <main className="route-page-container">
      <h1 className="route-page-title">Platform Admin Console (/admin)</h1>
      <p className="route-page-desc">
        Route group for internal platform accounts with Admin Console access.
      </p>
      <Link href="/" className="back-link">
        &larr; Back to Home
      </Link>
    </main>
  );
}
