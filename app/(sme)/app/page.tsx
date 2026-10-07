import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SME Application',
};

export default function SmeAppPage() {
  return (
    <main className="route-page-container">
      <h1 className="route-page-title">SME Application (/app)</h1>
      <p className="route-page-desc">
        Route group for business owners, managers, and staff.
      </p>
      <Link href="/" className="back-link">
        &larr; Back to Home
      </Link>
    </main>
  );
}
