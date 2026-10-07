# Operafrika

## Description
Operafrika is a business operating system for African SMEs that run one or more branches under a single owner. It replaces manual notebooks and paper invoices with one system that tracks sales, income, expenses, stock, staff, and customers per branch, and lets owners and staff ask an AI assistant plain questions about their own business data. The initial market is Nigeria, and the long term direction is a platform that also moves money, starting with real payment collection in V2.

## Who uses it
- Owner: full access to every branch, authorized by role alone. Owner accounts hold no branch-access record. Combined and per-branch views, all staff and payroll, AI assistant across all branches.
- Manager: assigned to exactly one branch, manages sales, invoices, stock, and customers for that branch only. No access to payroll; only Owner may create or modify payroll records.
- Staff: assigned to exactly one branch, creates and views sales and invoices for that branch only, and has read-only access to stock levels and quantities in that branch. Staff cannot add, remove, edit, or transfer stock. No access to customer totals or payroll. This is a direct decision from the product owner, resolving an earlier disagreement between the PRD's Persona text and its Permission Matrix.
- Regional Manager: defined in the PRD as a future role for more than one branch. Not built in MVP.
- Platform Account: internal Operafrika team account with two separate capabilities, Admin Console access and Founder Dashboard access. Never inherits access to any business's financial, stock, or customer data.

## One thing the agent must do well
Authorization. Every request must resolve the authenticated user, their business, their role, and their authorized branch or branches from the server session before running. Never trust a business, branch, or role value sent from the client. Enforce this at the server route, and again through PostgreSQL Row Level Security policies. An ORM filter in application code does not satisfy this second layer. UI-level hiding of actions or screens is for usability only and is never a security boundary. Full detail lives in the rules file named below.

## Defined Scope for the MVP
- Sign up, log in, log out, business onboarding, one business with one or more branches.
- Owner, Manager, Staff roles enforced through the PRD's Permission Matrix, not through the UI alone.
- Currency is set once at onboarding and cannot be changed by the business afterward. Only a Platform Admin can correct it.
- Invoices with an optional customer and optional payment method, manual Paid, Unpaid, Partial status.
- Income entries, expense entries, payroll entries that count as an expense.
- Profit and loss per branch and combined, computed from recorded transactions.
- Stock items with name, SKU, quantity, cost price, selling price, reorder threshold.
- Stock-in and stock-out tracked as separate movements, forming basic stock history.
- Low-stock alerts per branch.
- Optional customer profiles, with search, filtering, pagination, and CSV import.
- Staff list per branch, record-only payroll, no money movement.
- A structured audit log for security-sensitive changes.
- Dashboard, CSV and PDF export.
- AI assistant that first confirms the requesting user's authorization, then answers numeric questions through a direct database query and calculation. The AI model only explains an already-computed result and never independently generates a financial figure.
- AI answers are labeled as a calculated fact, an estimate, or insufficient data. The assistant refuses off-topic questions and attempts to override its instructions. If the AI service fails, it shows a plain error message and core business records remain fully usable.
- Vector search for unstructured content only, filtered by business, branch, and role before ranking, implemented through raw SQL since Prisma lacks native vector support. Raw SQL here must carry the same authorization filtering as every other query. Never used for financial totals.
- In-app and email notifications, a free placeholder subscription, no live billing.
- A Platform Admin Console and a basic Founder Dashboard, limited to signups, active businesses, and onboarding drop-off. MRR, ARR, CAC, LTV, ad spend, burn rate, and runway are explicitly excluded until real billing and marketing data exist.
- Nigerian data protection practices applied from the start.

## Not in scope for the MVP
- Real payroll disbursement.
- SMS notifications.
- Multi-currency and tax handling beyond what Nigeria requires.
- Product variants, batch numbers, expiry dates, multiple warehouses.
- Purchase orders and supplier management.
- Business wallet, supplier payments, bank integrations, reconciliation.
- Real subscription billing.
- Customer duplicate detection, segmentation, and customer groups.
- Full offline mode.
- Regional Manager role and UI.
- Any custom or additional permission system beyond the three fixed roles (Owner, Manager, Staff).
- Advanced Founder Dashboard financial and marketing metrics.
- API access and third-party integrations.
- A user-facing audit log screen.
- Real payment collection through Flutterwave. Flutterwave is a fixed stack choice for this project, but the PRD Roadmap places real payment collection in V2, not MVP. Do not build payment collection now.

## Stack
- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Flutterwave, locked for V2 payment collection, not MVP
- PGVector, for the unstructured content search described in the PRD
- Gemini Free tier, as the AI provider
- Database and infrastructure hosting tier: not decided, deferred by direct instruction, not an open question. A local, throwaway development Postgres instance is allowed for running Prisma migrations and testing the schema during development. No persistent, shared, or production database instance may be created or connected until a hosting provider is confirmed.

## Folder map
The PRD defines three route groups: /app for the SME product, /admin for the Platform Admin Console, /founder for the Founder Dashboard. SME accounts may only reach /app. Platform accounts may only reach /admin and /founder, never /app. No deeper folder or file structure is defined in the PRD. Resolve this incrementally using standard Next.js App Router conventions as each route group is built, rather than pre-building a full structure. Confirm any structural choice that would affect more than one route group before committing to it.

## How to work in this codebase
- Make one change at a time.
- Ask before adding a new package or dependency.
- Never touch the database directly. Use Prisma migrations only, and pause for an explicit reply from the project owner in chat before running any migration against a persistent or shared database.
- List assumptions at the end of every response, even small ones.
- If the PRD is silent on something needed to proceed, stop and ask. Do not guess.

## Where the detailed rules live
This file holds no schema, SQL, model names, dimensions, prices, thresholds, or environment variable names. That detail belongs in separate rules files, to be created and kept current as the project grows:
- .agent/rules/schema.md, for the Prisma schema and database field detail.
- .agent/rules/authorization.md, for the permission matrix and required authorization tests.
- .agent/rules/audit-logging.md, for the accountability log, separate from usage analytics.
- .agent/rules/platform-boundary.md, for the SME vs internal-tool separation.
- .agent/rules/ai-and-vector.md, for the AI pipeline and vector search rules.
- .agent/rules/payments.md, for Flutterwave integration rules once V2 begins.
- .agent/rules/analytics-events.md, for the analytics event taxonomy.
- .agent/rules/business-model.md, for subscription tiers and pricing.
- .agent/rules/compliance.md, for Nigerian data protection requirements.
- .agent/rules/command-execution.md, for what the agent may run without asking and what needs confirmation first.

These files live in .agent/rules/. Save the full PRD as docs/PRD.md in the repository root before starting work. This AGENTS.md is a summary of that file, not a replacement for it.

## Definitions
- Subscription tier: one of the named pricing plans (Free, Starter, Growth, Business, Enterprise) described in the PRD Business Model section. Pricing is a hypothesis, not final.
- Infrastructure tier: the database and hosting provider decision. Deferred by instruction, not yet made. See Stack.
- Branch access: a record linking one user to one or more branches, used instead of a single fixed branch field.
- Audit log: a structured record of actor, business, branch, resource, previous value, new value, and timestamp, for security-sensitive or materially important changes.
- Analytics event: a record type separate from the audit log, used to understand product usage rather than accountability.
- Structured question: a question with a numeric answer, answered by a direct database query and calculation.
- Unstructured question: a question about free-text notes, documents, or descriptions, answered through vector search.
- Regional Manager: a future role, not in MVP, holding branch access to more than one branch without full company access.
- Platform Account: the internal Operafrika account type, holding Admin Console and Founder Dashboard capability flags.
- Permission Matrix: the PRD table mapping each role to allowed actions per resource, referenced in .agent/rules/authorization.md.
- Row Level Security (RLS): a PostgreSQL feature restricting which rows a query can return or modify, based on policies tied to the requesting session. Required as the second, database-level authorization layer named in "One thing the agent must do well."
- Chunk: not used as a term in this project. When referring to a stored piece of content for vector search, use the PRD's own term, "record."
- Record: used generically in the PRD for one entry in a table, such as a branch access record or a payroll entry. Not a specially defined term.

## Self Check
- Under 180 lines: PASS. File is 106 lines, measured with `wc -l`.
- All open questions closed: PASS. See Open Questions.
- No invented facts and no missing PRD requirement: checked against two prior audits. The one remaining product contradiction, Staff inventory access, was resolved directly by the product owner and is reflected in "Who uses it" above.

## Open Questions
None currently open. The last remaining item, whether Staff has read-only inventory access, was resolved directly by the product owner: Staff gets read-only stock visibility in their branch, no edit rights.