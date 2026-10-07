import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PrivacyPolicyView, TermsOfServiceView } from './legal';
import LandingNav from './landing-nav';

export const metadata: Metadata = {
  title: { absolute: 'Operafrika — Business Operating System for African SMEs' },
  description: 'Sales, stock, staff, branches',
  keywords: [
    'business operating system',
    'African SMEs',
    'sales',
    'inventory',
    'staff',
    'branches',
  ],
  authors: [{ name: 'Operafrika' }],
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Operafrika',
    title: 'Operafrika — Business Operating System for African SMEs',
    description: 'Sales, stock, staff, branches',
    url: '/',
    images: [
      {
        url: '/logo/operafrika_logo_512x512.png',
        width: 512,
        height: 512,
        alt: 'Operafrika',
      },
    ],
    locale: 'en_NG',
  },
  twitter: { card: 'summary' },
};

const capabilityCards = [
  {
    badgeClass: 'badge-sme',
    badge: 'Money in and out',
    title: 'Sales, invoices, income, and expenses',
    body: 'Record sales, invoices, income, and expenses per branch. Payroll counts as an expense.',
  },
  {
    badgeClass: 'badge-admin',
    badge: 'Profit and loss',
    title: 'Computed from recorded transactions',
    body: 'Calculated per branch, and combined across all branches for the Owner, from recorded income and expenses.',
  },
  {
    badgeClass: 'badge-founder',
    badge: 'Stock',
    title: 'Items, movement history, and low-stock alerts',
    body: 'Items with quantity, cost, and selling price, plus stock movement history and low-stock alerts.',
  },
  {
    badgeClass: 'badge-sme',
    badge: 'Customers',
    title: 'Optional profiles, with no sale blocked',
    body: 'Optional profiles, searchable and importable from CSV. No sale ever requires one.',
  },
  {
    badgeClass: 'badge-admin',
    badge: 'People and payroll',
    title: 'A staff list and a record-only payroll log',
    body: 'A staff list per branch and a record-only payroll log that feeds into expenses. No money moves.',
  },
  {
    badgeClass: 'badge-founder',
    badge: 'Reports and exports',
    title: 'A dashboard, plus CSV and PDF export',
    body: 'A per-branch dashboard, a combined Owner view, and CSV and PDF export.',
  },
  {
    badgeClass: 'badge-sme',
    badge: 'Notifications and support',
    title: 'In-app and email only',
    body: 'In-app and email notifications, an FAQ, and a direct line to the platform team.',
  },
];

const answerLabels = [
  'Calculated fact',
  'Estimate or prediction',
  'Not enough data to answer reliably',
];

const answerFlow = [
  'Your question',
  'Access check',
  'Database query',
  'Calculation',
  'Plain-language answer',
];

const assistantPoints = [
  'Numeric answers are calculated from your own records. The assistant explains the result but never invents a figure.',
  'It only searches your business\u2019s own notes and documents, never the internet or another business.',
  'It refuses off-topic questions. If the AI service ever fails, your sales, stock, and records keep working normally.',
];

const roleCards = [
  {
    title: 'Owner',
    body: 'Full access to every branch: combined or single-branch views, all staff and payroll, and the AI assistant across the whole business.',
  },
  {
    title: 'Manager',
    body: 'One branch only: manages sales, invoices, stock, and customers there.',
  },
  {
    title: 'Staff',
    body: 'One branch only: creates and views sales and invoices, and reads stock levels there.',
  },
];

const accessPoints = [
  'Your role and the branches you can see are checked on the server before anything runs.',
  'A value sent from the browser is never trusted. If it can be edited, it is ignored for access.',
  'Checks happen twice: first on the server, then again at the database level. Both must agree.',
  'Hiding a button in the interface is for usability only. The real protection is those server and database checks.',
];

const protectionPractices = [
  'Data minimization',
  'Server-enforced access control',
  'Authentication and authorization',
  'Encryption in transit and at rest',
  'Defined retention and deletion',
  'Review of third-party processors',
  'Data export and access requests',
];

type LandingPageProps = {
  searchParams: { view?: string | string[] };
};

export default function LandingPage({ searchParams }: LandingPageProps) {
  const view = Array.isArray(searchParams.view)
    ? searchParams.view[0]
    : searchParams.view;

  return (
    <div className="landing">
      <LandingNav />

      <main>
        {view === 'privacy' ? (
          <PrivacyPolicyView />
        ) : view === 'terms' ? (
          <TermsOfServiceView />
        ) : (
          <>
        <section className="landing-section">
          <div className="landing-section-inner landing-hero">
            <h1 className="landing-title">One system for every branch you run.</h1>
            <p className="landing-lede">
              Track sales, expenses, stock, and staff across every branch you
              run. See profit, stock alerts, and who owes what, all in one
              place.
            </p>
            <div className="landing-actions">
              <Link href="/app/signup" className="landing-cta">
                Get started
              </Link>
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-section-card"
          aria-labelledby="landing-capabilities-heading"
        >
          <div className="landing-section-inner">
            <h2
              className="landing-heading"
              id="landing-capabilities-heading"
            >
              What Operafrika does
            </h2>
            <div className="landing-grid">
              {capabilityCards.map((card, index) => (
                <article
                  className="landing-card"
                  key={card.title}
                  aria-labelledby={`capability-heading-${index}`}
                >
                  <span
                    className={`badge-tag ${card.badgeClass}`}
                  >
                    {card.badge}
                  </span>
                  <h3
                    className="card-heading"
                    id={`capability-heading-${index}`}
                  >
                    {card.title}
                  </h3>
                  <p className="card-body">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-section-alt"
          aria-labelledby="landing-assistant-heading"
        >
          <div className="landing-section-inner">
            <h2 className="landing-heading" id="landing-assistant-heading">
              Ask a question in plain language
            </h2>
            <p className="landing-lede">
              Ask about your own business and get a clear answer, using only the
              data your role allows you to see.
            </p>
            <div className="landing-flow">
              {answerFlow.map((step, index) => (
                <Fragment key={step}>
                  <span className="landing-flow-step">{step}</span>
                  {index < answerFlow.length - 1 ? (
                    <span className="landing-flow-arrow" aria-hidden="true">
                      &rarr;
                    </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
            <p className="landing-note">
              Every answer is labelled as one of the following.
            </p>
            <div className="landing-flow">
              {answerLabels.map((label) => (
                <span className="landing-flow-step" key={label}>
                  {label}
                </span>
              ))}
            </div>
            <div className="landing-list">
              {assistantPoints.map((point) => (
                <p className="landing-list-item" key={point}>
                  {point}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section
          className="landing-section"
          aria-labelledby="landing-roles-heading"
        >
          <div className="landing-section-inner">
            <h2 className="landing-heading" id="landing-roles-heading">
              Built around three roles
            </h2>
            <p className="landing-lede">
              Each role is scoped to its own branch or branches, so a person only
              ever sees what their role allows.
            </p>
            <div className="landing-grid">
              {roleCards.map((role, index) => (
                <article
                  className="landing-card"
                  key={role.title}
                  aria-labelledby={`role-heading-${index}`}
                >
                  <h3 className="card-heading" id={`role-heading-${index}`}>
                    {role.title}
                  </h3>
                  <p className="card-body">{role.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-section-alt"
          aria-labelledby="landing-access-heading"
        >
          <div className="landing-section-inner">
            <h2 className="landing-heading" id="landing-access-heading">
              Access is decided on the server, not in the interface
            </h2>
            <p className="landing-lede">
              What you can see is decided by your role and checked on the
              server, not by what the interface shows you.
            </p>
            <div className="landing-list">
              {accessPoints.map((point) => (
                <p className="landing-list-item" key={point}>
                  {point}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section
          className="landing-section"
          aria-labelledby="landing-protection-heading"
        >
          <div className="landing-section-inner">
            <h2 className="landing-heading" id="landing-protection-heading">
              Real business data, protected from day one
            </h2>
            <p className="landing-lede">
              The pilot uses real business data: real customers, staff, sales,
              expenses, inventory, invoices, and payroll records. Data protection
              and authorization are treated as core requirements from the
              start, not later additions.
            </p>
            <div className="landing-grid">
              <article className="landing-card" aria-labelledby="practices-heading">
                <h3 className="card-heading" id="practices-heading">
                  Practices applied
                </h3>
                <div className="landing-list">
                  {protectionPractices.map((practice) => (
                    <p className="landing-list-item" key={practice}>
                      {practice}
                    </p>
                  ))}
                </div>
              </article>
              <article className="landing-card" aria-labelledby="nigeria-heading">
                <h3 className="card-heading" id="nigeria-heading">
                  Nigeria, reviewed properly
                </h3>
                <p className="card-body">
                  The Nigeria Data Protection Act and the relevant Nigeria Data
                  Protection Commission requirements are to be reviewed with
                  qualified legal guidance before the pilot scales beyond its
                  initial size. If the product expands to another country, that
                  country&rsquo;s data protection requirements are assessed
                  before operating there.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="landing-section landing-section-alt"
          aria-labelledby="landing-start-heading"
        >
          <div className="landing-section-inner">
            <h2 className="landing-heading" id="landing-start-heading">
              One business, one or more branches
            </h2>
            <p className="landing-lede">
              A business workspace holds one main business with one or more
              branches underneath it, each with a name, address, and contact
              info. The owner can view company-wide information or switch to a
              single branch at any time.
            </p>
            <div className="landing-actions">
              <Link href="/app/signup" className="landing-cta">
                Get started
              </Link>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="landing-footer-text">
            &copy; {new Date().getFullYear()} Operafrika.
          </p>
          <p className="landing-footer-text">
            Business operating system for African SMEs running one or more
            branches under a single owner.
          </p>
          <nav className="landing-footer-links" aria-label="Legal">
            <Link href="/?view=privacy" className="landing-footer-link">
              Privacy Policy
            </Link>
            <Link href="/?view=terms" className="landing-footer-link">
              Terms of Service
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}