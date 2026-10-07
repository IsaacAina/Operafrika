import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

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

const problemPoints = [
  'Each branch runs on its own notebook, its own invoice pad, and its own memory of what was sold, what is owed, and what is running low.',
  'The owner cannot see combined profit and loss across branches without manually gathering numbers from each one.',
  'Staff have no consistent way to log sales or check stock.',
  'There is no record of who owes what, what payroll has been paid, or which items are about to run out, until it becomes a problem.',
];

const capabilityCards = [
  {
    badgeClass: 'badge-sme',
    badge: 'Money in and out',
    title: 'Sales, invoices, income, and expenses',
    body: 'Invoices per branch with an optional customer and an optional payment method, and a manual Paid, Unpaid, or Partial status. A quick walk-in sale is simply an invoice created without a customer, defaulting to Paid. Income entries can sit outside an invoice, expense entries are recorded per branch, and payroll counts as an expense in the profit and loss calculation.',
  },
  {
    badgeClass: 'badge-admin',
    badge: 'Profit and loss',
    title: 'Computed from recorded transactions',
    body: 'Profit and loss is calculated per branch, and combined across all branches for the Owner role, from the income and expenses actually recorded, including payroll, over a selected period.',
  },
  {
    badgeClass: 'badge-founder',
    badge: 'Stock',
    title: 'Items, movement history, and low-stock alerts',
    body: 'Product name, SKU or product code, quantity in stock, cost price, selling price, and a low-stock threshold. Every change is recorded as a distinct stock-in or stock-out movement, forming a stock history for that item. Stock goes out automatically when an invoice item is created against it, and a low-stock alert is shown when quantity falls at or below the threshold.',
  },
  {
    badgeClass: 'badge-sme',
    badge: 'Customers',
    title: 'Optional profiles, with no sale blocked',
    body: 'A customer profile is optional and no sale requires one, so a walk-in sale can be recorded in seconds. Where profiles do exist, the list can be searched, filtered, and paginated, and an existing customer list can be imported from CSV, processed in batches and validated before any record is committed.',
  },
  {
    badgeClass: 'badge-admin',
    badge: 'People and payroll',
    title: 'A staff list and a record-only payroll log',
    body: 'A staff list per branch, with each person holding a role. A payroll entry records the employee, pay period, salary amount, and payment status, and feeds into expense totals. It is a record only. No payment is processed and no money moves.',
  },
  {
    badgeClass: 'badge-founder',
    badge: 'Reports and exports',
    title: 'A dashboard, plus CSV and PDF export',
    body: 'The dashboard shows today\u2019s sales, the week\u2019s sales, profit and loss, and the low-stock count, filterable by branch, with a combined view available to the Owner role. Reports and invoices can be exported as CSV or PDF.',
  },
  {
    badgeClass: 'badge-sme',
    badge: 'Notifications and support',
    title: 'In-app and email only',
    body: 'Notifications are sent in-app and by email. There is an FAQ, and a direct message channel to the platform team.',
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
  'For a question with a numeric answer, the system runs a direct database query and calculation first. The model only explains the result that was already computed, and never generates a financial figure of its own.',
  'Vector search is reserved for genuinely unstructured business information, such as free-text notes, uploaded documents, and product descriptions. It is never used for a numeric or financial total, and a search is filtered to the same business, branch, and role limits as every other data access before ranking runs.',
  'It answers only when asked. It does not use internet data, market or industry benchmark data, or any other business\u2019s data, and it refuses questions unrelated to the business.',
  'If the AI service fails or is rate-limited, the assistant shows a plain error message. Sales, invoices, inventory, and financial records stay fully available, because AI availability is never a condition for accessing core business records.',
];

const roleCards = [
  {
    title: 'Owner',
    body: 'Runs the business. Has access to every branch, and can view combined, company-wide information or switch to a single branch view. Sees combined profit and loss, all staff, and all payroll, and can ask the AI assistant about any branch or the whole business.',
  },
  {
    title: 'Manager',
    body: 'Assigned to exactly one branch. Sees and manages sales, invoices, stock, and customers for that branch only, and reads the staff list for their own branch.',
  },
  {
    title: 'Staff',
    body: 'Assigned to exactly one branch. Creates and views sales and invoices for that branch only, and sees stock levels and quantities there on a read-only basis, without being able to add, edit, remove, or transfer stock. Customer totals and payroll are not visible.',
  },
];

const accessPoints = [
  'Every protected request resolves the authenticated user, their business, their role, and their branch access from the server session, before anything runs.',
  'Business, branch, and role values sent from the client are never trusted as proof of access. A manipulated value is ignored, not honored.',
  'Authorization runs on two independent layers. The server checks the request before it reaches the database, and PostgreSQL Row Level Security checks the query again, independently.',
  'Row Level Security refuses to return or modify rows outside the caller\u2019s authorized scope, even if a server-side check is missed.',
  'A Manager or Staff account cannot be created without exactly one branch-access record. That is checked in the API layer at account creation.',
  'The interface hides actions and screens a person cannot perform, for usability only. A hidden button is not a security boundary.',
];

const protectionPractices = [
  'Data minimization',
  'Access control',
  'Authentication',
  'Authorization',
  'Encryption in transit',
  'Encryption and security controls at rest',
  'Secure secrets management',
  'Defined data retention and deletion practices',
  'Privacy notices',
  'Review of third-party processors',
  'Support for data export and access requests',
];

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Primary">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand" aria-label="Operafrika home">
            <Image
              src="/icon.svg"
              alt="Operafrika"
              width={32}
              height={32}
              priority
            />
          </Link>
          <div className="landing-actions">
            <Link href="/app" className="landing-cta">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="landing-section">
          <div className="landing-section-inner landing-hero">
            <p className="landing-eyebrow">
              Business operating system for African SMEs
            </p>
            <h1 className="landing-title">One system for every branch you run.</h1>
            <p className="landing-lede">
              Operafrika is a business operating system for African SMEs that
              run one or more branches under a single owner. It replaces manual
              notebooks, loose invoice pads, and informal bookkeeping with one
              system that tracks money in, money out, stock, staff, and
              customers per branch. An AI assistant lets owners and staff ask
              plain questions about their own business data and get direct
              answers, scoped to both their branch access and their role.
            </p>
            <div className="landing-actions">
              <Link href="/app" className="landing-cta">
                Get started
              </Link>
              <Link href="/app" className="landing-cta landing-cta-quiet">
                See the SME product
              </Link>
            </div>
            <p className="landing-note">The initial market is Nigeria.</p>
          </div>
        </section>

        <section
          className="landing-section landing-section-alt"
          aria-labelledby="landing-problem-heading"
        >
          <div className="landing-section-inner">
            <h2 className="landing-heading" id="landing-problem-heading">
              The picture is spread across notebooks
            </h2>
            <p className="landing-lede">
              Small business owners running more than one branch have no simple
              way to see their full picture.
            </p>
            <div className="landing-list">
              {problemPoints.map((point) => (
                <p className="landing-list-item" key={point}>
                  {point}
                </p>
              ))}
            </div>
            <p className="landing-note">
              This problem is stated as an informed assumption rather than
              proven fact, and is treated as a hypothesis to validate during the
              test window.
            </p>
          </div>
        </section>

        <section
          className="landing-section"
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
              {capabilityCards.map((card) => (
                <article className="landing-card" key={card.title}>
                  <span
                    className={`badge-tag ${card.badgeClass}`}
                  >
                    {card.badge}
                  </span>
                  <h3 className="card-heading">{card.title}</h3>
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
              The assistant answers using only the data the asking person&rsquo;s
              business, branch, and role already authorize. It does not use data
              from another business, and it does not pull from the internet.
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
              The model explains an already-computed result. Every answer is
              labelled as one of the following.
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
              {roleCards.map((role) => (
                <article className="landing-card" key={role.title}>
                  <h3 className="card-heading">{role.title}</h3>
                  <p className="card-body">{role.body}</p>
                </article>
              ))}
            </div>
            <p className="landing-note">
              A Regional Manager role, for someone covering more than one branch
              without full company-wide access, is not part of this version.
            </p>
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
              Authorization is a core system requirement in this product, not a
              user interface concern.
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
              <article className="landing-card">
                <h3 className="card-heading">Practices applied</h3>
                <div className="landing-list">
                  {protectionPractices.map((practice) => (
                    <p className="landing-list-item" key={practice}>
                      {practice}
                    </p>
                  ))}
                </div>
              </article>
              <article className="landing-card">
                <h3 className="card-heading">Nigeria, reviewed properly</h3>
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
              <Link href="/app" className="landing-cta">
                Get started
              </Link>
            </div>
          </div>
        </section>
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
        </div>
      </footer>
    </div>
  );
}