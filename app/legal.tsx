import Link from 'next/link';
import type { ReactNode } from 'react';

function LegalNav({ active }: { active: 'privacy' | 'terms' }) {
  return (
    <nav className="landing-actions legal-nav" aria-label="Legal pages">
      <Link
        href="/?view=privacy"
        className={active === 'privacy' ? 'back-link back-link-active' : 'back-link'}
      >
        Privacy Policy
      </Link>
      <Link
        href="/?view=terms"
        className={active === 'terms' ? 'back-link back-link-active' : 'back-link'}
      >
        Terms of Service
      </Link>
    </nav>
  );
}

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <h2 className="landing-heading">{title}</h2>
      {children}
    </>
  );
}

function LegalPoints({ items }: { items: string[] }) {
  return (
    <div className="landing-list">
      {items.map((item) => (
        <p className="landing-list-item" key={item}>
          {item}
        </p>
      ))}
    </div>
  );
}

function LegalPage({
  title,
  updated,
  children,
  active,
}: {
  title: string;
  updated: string;
  children: ReactNode;
  active: 'privacy' | 'terms';
}) {
  return (
    <section className="landing-section">
      <div className="landing-section-inner">
        <LegalNav active={active} />
        <Link href="/" className="back-link">
          &larr; Back to home
        </Link>
        <h1 className="route-page-title">{title}</h1>
        <p className="landing-note">Last updated: {updated}</p>
        {children}
      </div>
    </section>
  );
}

export function PrivacyPolicyView() {
  return (
    <LegalPage
      active="privacy"
      title="Privacy Policy"
      updated="7 October 2026"
    >
      <p className="landing-lede">
        This policy explains how Operafrika collects, uses, protects, retains,
        and deletes personal data through the Operafrika business operating
        system for African SMEs. We operate in Nigeria and apply Nigerian data
        protection requirements, including the Nigeria Data Protection Act,
        2023, and the expectations of the Nigeria Data Protection Commission
        (NDPC).
      </p>

      <LegalSection title="1. Data we collect">
        <LegalPoints
          items={[
            'Account information: your name, email address, and the password you use to log in.',
            'Business and branch information: business name, business type, currency, and contact information for the business and its branches.',
            'People records: staff names, roles, contact details as provided, and payroll records.',
            'Customer records: customer profiles you add, such as name and contact details, and their sales and invoice history.',
            'Financial records: invoices, income, expenses, payment status, and the transactions that feed profit and loss.',
            'Stock records: item names, SKUs or product codes, quantities, cost and selling prices, and movement history.',
            'AI interactions: questions you ask the AI assistant, and the free-text notes, uploaded documents, and product descriptions the assistant is allowed to search for unstructured answers.',
            'Usage analytics: product-usage events recorded under a fixed event taxonomy. These never carry sensitive personal or financial values beyond what a defined product question requires, and are kept separate from the audit log.',
            'Audit log: structured records of actor, business, branch, resource, previous value, new value, and timestamp for security-sensitive or materially important changes.',
          ]}
        />
      </LegalSection>

      <LegalSection title="2. How we use your data">
        <LegalPoints
          items={[
            'To run the service: recording sales, income, expenses, stock, staff, and customers, and producing dashboards and reports.',
            'To enforce access: your role and branch access decide what you can see, checked on the server and again at the database level.',
            'To answer AI questions using only the data your business, branch, and role authorize.',
            'To send in-app and email notifications, and to provide support through the platform team.',
            'To protect against misuse and to keep an audit log for accountability.',
            'To understand product usage through analytics events such as signups, active businesses, and onboarding progress.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Legal basis for processing">
        <p className="card-body">
          Under the Nigeria Data Protection Act, 2023, we process personal data
          on the basis of performance of the contract with your business,
          legitimate interests such as security and service improvement,
          consent where we ask for it, and our legal obligations.
        </p>
      </LegalSection>

      <LegalSection title="4. How we protect your data">
        <LegalPoints
          items={[
            'Data minimization: we collect only what the service needs.',
            'Access control, authentication, and authorization for every request.',
            'Authorization on two independent layers: the server and PostgreSQL Row Level Security.',
            'Encryption in transit and appropriate encryption and security controls at rest.',
            'Secure secrets management.',
            'Defined data retention and deletion practices.',
            'A structured audit log for security-sensitive changes.',
            'Review of third-party processors before they handle data.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Who we share data with">
        <LegalPoints
          items={[
            'Service providers needed to run the service, such as hosting, email notification, and the AI service provider. We share only what each provider needs and review providers before using them.',
            'Internal platform accounts. By design, in this version platform accounts cannot access your financial, stock, or customer data.',
            'Authorities, where Nigerian law requires disclosure.',
          ]}
        />
        <p className="card-body">
          We do not sell personal data and we never use another
          business&rsquo;s data to answer your questions.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention and deletion">
        <p className="card-body">
          We keep personal data only as long as needed to provide the service
          and to satisfy our retention and deletion practices. You can request
          deletion, and the service supports data export and access requests.
          The audit log is retained for accountability.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights under the Nigeria Data Protection Act">
        <LegalPoints
          items={[
            'Access a copy of the personal data we hold about you.',
            'Request correction of inaccurate data.',
            'Request erasure, subject to legal requirements.',
            'Restrict or object to processing in the circumstances the law allows.',
            'Receive your data in a structured, portable format where applicable.',
            'Withdraw consent you have given, where processing relies on it.',
          ]}
        />
        <p className="card-body">
          To exercise any of these rights, contact the platform team through the
          in-app support channel. If you believe your data protection rights
          have not been respected, you may also complain to the Nigeria Data
          Protection Commission (NDPC).
        </p>
      </LegalSection>

      <LegalSection title="8. International processing">
        <p className="card-body">
          Some service providers, including the AI service provider, may
          process data outside Nigeria. We apply appropriate safeguards and
          review providers before they handle data. If we expand to another
          country, that country&rsquo;s data protection requirements will be
          assessed before we operate there.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        <p className="card-body">
          If we change this policy in a material way, we will notify you in-app
          and by email before the change takes effect.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p className="card-body">
          You can reach the platform team through the in-app support channel.
          This policy reflects current pilot practices and will be reviewed
          with qualified legal guidance before the pilot scales beyond its
          initial size. It is not legal advice.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

export function TermsOfServiceView() {
  return (
    <LegalPage
      active="terms"
      title="Terms of Service"
      updated="7 October 2026"
    >
      <p className="landing-lede">
        These terms govern your use of Operafrika, a business operating system
        for African SMEs running one or more branches under a single owner. By
        creating an account, you agree to these terms.
      </p>

      <LegalSection title="1. The service">
        <p className="card-body">
          Operafrika provides one business workspace with one or more branches,
          used to record sales, invoices, income, expenses, payroll records,
          stock, staff, and customers, to produce dashboards and reports, and
          to ask an AI assistant questions about your own data.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and roles">
        <LegalPoints
          items={[
            'You are responsible for your credentials and for the people you give access to.',
            'Accounts use three fixed roles with fixed permissions: Owner, Manager, and Staff.',
            'The Owner controls the business workspace and manages staff, payroll, and settings.',
            'Manager and Staff accounts are tied to exactly one branch.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Your data">
        <p className="card-body">
          Your business data belongs to you and your business. Operafrika
          processes it only to provide the service and to keep it secure. You
          can export your data and request its deletion.
        </p>
      </LegalSection>

      <LegalSection title="4. Subscription and payments">
        <LegalPoints
          items={[
            'In this version, businesses receive a free test plan placeholder with a price of zero and a renewal date. It is clearly labeled as a placeholder.',
            'There is no live billing, no automatic charge, and no payment collection in this version. The selected payment partner is not active until a later version.',
            'We will ask for your express consent before any paid plan begins.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. AI assistant">
        <LegalPoints
          items={[
            'Answers are derived from your own data and are labeled as a calculated fact, an estimate, or insufficient data.',
            'The assistant is not legal, tax, or accounting advice, and it does not replace professional judgement.',
            'The assistant is optional. If the AI service fails, your invoices, sales, stock, and financial records remain fully usable.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <LegalPoints
          items={[
            'Do not attempt to access another business\u2019s data or to bypass access checks.',
            'Do not interfere with the service, attempt to break its security, or misuse it.',
            'Do not submit unlawful content or use the service to break Nigerian law.',
            'Your access is granted to your business only, for running that business.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Availability">
        <p className="card-body">
          We aim to keep the service available, but it is provided on an
          &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. Maintenance,
          outages, limits, and errors can occur, and we are not liable for
          losses caused by them.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual property">
        <p className="card-body">
          Operafrika and its software, design, and content belong to Operafrika
          or its licensors. We grant you a limited, personal right to use the
          service for your business. You keep the rights in your own data.
        </p>
      </LegalSection>

      <LegalSection title="9. Liability">
        <p className="card-body">
          To the extent permitted by Nigerian law, Operafrika is not liable for
          indirect or consequential losses, and its total liability under these
          terms is limited to the fees you have actually paid for the service.
          In this version, the service is provided without charge, so this
          limit will generally be zero.
        </p>
      </LegalSection>

      <LegalSection title="10. Termination">
        <p className="card-body">
          You can stop using the service and close your account at any time.
          Data is then handled under our retention and deletion practices. We
          may suspend or close an account that breaches these terms.
        </p>
      </LegalSection>

      <LegalSection title="11. Governing law">
        <p className="card-body">
          These terms are governed by the laws of the Federal Republic of
          Nigeria, and disputes are subject to the jurisdiction of Nigerian
          courts.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p className="card-body">
          You can reach the platform team through the in-app support channel.
          These terms reflect the current version of the service and are not
          legal advice.
        </p>
      </LegalSection>
    </LegalPage>
  );
}