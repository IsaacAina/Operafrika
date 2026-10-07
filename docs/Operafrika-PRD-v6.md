*Version 5. Patches a contradiction between the Staff Persona description and the Permission Matrix regarding stock access. Resolution, confirmed by the product owner: Staff has read-only visibility into stock levels and quantities for their assigned branch, and cannot add, edit, remove, or transfer stock. See Users and Personas and Functional Requirement 29.*

*Version 6. Locks three previously open implementation choices with fixed stack variables: Gemini Free tier as the AI provider, pgvector as the vector storage implementation, and Flutterwave as the specific V2 payment provider. Adds a new operational requirement to verify Gemini's free-tier rate limits against the full pilot scale before relying on them. Database and infrastructure hosting tier remains deliberately unresolved. See AI and AI-Related Tools and Solutions, Vector Database Architecture and Design, Roadmap, Operational Policies, and Remaining Implementation and Validation Decisions.*

## Product Summary

Operafrika is a business operating system for African SMEs that run one or more branches under a single owner. It replaces manual notebooks, loose invoice pads, and informal bookkeeping with one system that tracks money in, money out, stock, staff, and customers per branch. An AI assistant lets the owner and staff ask plain questions about their own business data and get direct answers, scoped to both their branch access and their role.

The initial market is Nigeria, and the pilot uses real business data: real customers, staff, sales, expenses, inventory, invoices, and payroll records. This means data protection and authorization are treated as core MVP requirements, not later additions.

The product starts as an operating system for SMEs to manage daily operations and understand their numbers from one place. Over time, it is intended to grow into a fuller business and financial platform that also helps SMEs move money, not just record it. Version 1 focuses on the first part of that vision and does not move money. It stays intentionally narrow, though real payment collection is now planned for V2, not deferred indefinitely (see Roadmap).

There are two internal-facing capabilities, separate from the SME product: a **Founder Dashboard**, which shows how the Operafrika business itself is performing, and a **Platform Admin Console**, which shows what is happening operationally across the platform. Both live inside the same protected internal account type in v1, described later in this document.

## Problem

Small business owners running more than one branch have no simple way to see their full picture. Each branch runs on its own notebook, its own invoice pad, and its own memory of what was sold, what is owed, and what is running low. The owner cannot see combined profit and loss across branches without manually gathering numbers from each one. Staff have no consistent way to log sales or check stock. There is no record of who owes what, what payroll has been paid, or which items are about to run out, until it becomes a problem.

This problem statement is based on informed assumption, not user research. It should be treated as a hypothesis to validate during the test window, not as proven fact.

## Goals

**Business goals**
- Get 20 to 50 real Nigerian SMEs actively logging real business data within the test window, measured against the specific targets in Success Metrics.
- Prove that an owner will check a combined, cross-branch view of their business at least weekly.
- Prove the AI assistant gets used for real questions, not just tried once.
- Validate that the branch-isolated, role-isolated data model holds up with real, messy business data, with no unauthorized data exposure across the test period.
- Show that owners report the app saves them time or helps them catch a missed payment or stockout, measured through an end-of-test survey.
- Prove businesses will use the product without customer profiles being mandatory.

**User goals**
- Owner: see money, stock, and staff across every branch in one place, without visiting each branch.
- Manager and Staff: log sales, invoices, and stock for their own branch without needing training.
- Owner: get a plain-language answer to a business question without opening a report.
- Owner: know when stock is running low before it runs out.
- Staff: record a walk-in sale in seconds, without being forced to create a customer profile first.

## Users and Personas

**Owner**
Runs the business. Has access to every branch, and can view combined, company-wide information or switch to a single branch view. Sees combined profit and loss, all staff, all payroll, and can ask the AI assistant about any branch or the whole business. An Owner account holds no branch-access records at all. Authorization logic treats the Owner role as a full bypass of branch filtering, not as a branch value to compare against.

**Manager**
Assigned to exactly one branch in v1, through a branch-access record rather than a fixed field (see Technical Architecture). This is enforced at account creation: a Manager account cannot be created without exactly one branch-access record. Sees and manages sales, invoices, stock, and customers for that branch only.

**Staff**
Assigned to exactly one branch in v1, enforced the same way as Manager. Can create and view sales and invoices for their branch only. Has read-only access to stock levels and quantities in that branch, and cannot add, edit, remove, or transfer stock. Cannot see customer totals or payroll, whether through the normal interface or through the AI assistant. This read-only stock access was confirmed directly by the product owner, resolving an earlier disagreement between this Persona description and the Permission Matrix.

**Regional Manager** *(not in MVP)*
A future role that would hold branch-access records for more than one branch, without full company-wide access. The underlying branch-access model is built so this role can be introduced later without a database redesign. Not built or exposed in v1.

**Platform Account (Operafrika internal team)**
A single internal account type, separate from SME business accounts, with two independent capabilities: access to the Platform Admin Console and access to the Founder Dashboard. Initially, the same person holds both capabilities. A platform account never automatically inherits access to any business's financial, stock, or customer data. Access to business data from the Platform Admin Console must be separately and explicitly authorized if ever needed, and is not built in v1.

## Authorization Model and Permission Matrix

Authorization is a core system requirement in this product, not a UI concern. It must never depend on what the interface happens to show or hide.

**Every protected request must resolve, in this order:**
1. The authenticated user.
2. The user's business.
3. The user's role.
4. The branch or branches the user is authorized to access.
5. The action being attempted.
6. The specific resource being accessed.

Client-provided values for business, branch, or role are never trusted as proof of access. They are only ever read from the authenticated server-side session.

**Three enforcement layers, all required:**
- **Server-side authorization** — every API route validates the request against the rules above before touching the database.
- **PostgreSQL Row Level Security** — a second, independent layer that refuses to return or modify rows outside the caller's authorized scope, even if a server-side check is missed.
- **UI permissions** — hides unavailable actions and screens for usability only. Never treated as a security boundary.

Authorization logic is implemented once, through shared, reusable code, and every route uses the same mechanism. An AI coding agent must not invent or infer a permission that isn't explicitly defined below. If this document doesn't state a permission, it does not exist yet.

**Permission matrix (v1)**

| Resource | Owner | Manager | Staff | Branch scope | Audited on change |
|---|---|---|---|---|---|
| Business profile | Read, update | Read | Read | Whole business (Owner), own branch view (Manager/Staff) | Yes |
| Branches | Read, create, update | Read own branch | Read own branch | As above | Yes |
| Sales / Invoices | Read, create, update, cancel, all branches | Read, create, update, cancel, own branch | Read, create, own branch | Per branch | Yes |
| Expenses | Read, create, update, all branches | Read, create, update, own branch | No access | Per branch | Yes |
| Income | Read, create, update, all branches | Read, create, update, own branch | No access | Per branch | Yes |
| Inventory | Read, create, update, all branches | Read, create, update, own branch | Read own branch (view only) | Per branch | Yes |
| Customers | Read, create, update, all branches | Read, create, update, own branch | Read, create, own branch | Per branch | Where appropriate |
| Staff | Read, create, update, all branches | Read own branch's staff list | No access | Per branch (Owner: all) | Yes |
| Payroll | Read, create, update, all branches | No access | No access | Business-wide (Owner only) | Yes |
| Reports / Exports | All, all branches | Own branch | Sales/invoices only, own branch | Per branch | No |
| AI assistant | All data types, all branches | Data types Manager can see, own branch | Sales/invoices only, own branch | Per branch and per role | No (underlying query is) |
| Settings | Full access | View only | No access | Business-wide | Yes on currency correction (Platform Admin only) |
| Audit / activity log | Not user-facing in v1 | Not user-facing in v1 | Not user-facing in v1 | Internal only | N/A |

**Required authorization tests before launch**
- Owner accessing every branch they own.
- Manager and Staff attempting to access a branch they are not assigned to (must fail).
- Any user attempting to access another business's data (must fail).
- Direct URL or API calls to protected routes without going through the UI (must fail the same way).
- Manipulated `businessId`, `branchId`, or `role` values sent from the client (must be ignored, not trusted).
- AI assistant requests attempting to retrieve data outside the asking user's authorized scope (must fail the same way as a direct API call).

## Scope

**In Scope for v1**

*Account, business structure, and authorization*
- Sign up, log in, log out
- Business onboarding: business name, business type, single currency (Nigerian Naira by default, stored as a plain field, not hard-coded permanently), contact info
- One main business workspace, with one or more branches underneath it
- The owner can view company-wide information or switch to a single branch
- Owner, Manager, Staff roles, enforced through the permission matrix and both server-side and database-level authorization
- A branch-access data model that supports assigning a user to one branch now, and more than one branch later, without a redesign

*Money in and out*
- Invoices per branch: item, quantity, price, an optional customer, an optional payment method, total, no tax calculation
- Manual invoice status: Paid, Unpaid, Partial, with payment amount and payment date captured where applicable
- A quick walk-in sale is simply an invoice created without a customer, defaulting to Paid
- Income entries not tied to an invoice, with an optional customer link
- Expense entries per branch
- Payroll entries count as an expense in the profit and loss calculation
- Profit and loss summary, per branch and combined, computed only from recorded transactions

*Stock*
- Product name, SKU or product code, quantity in stock, cost price, selling price, low-stock threshold
- Stock-in and stock-out tracked as distinct movement records, forming a basic stock history per item
- Automatic stock-out on invoice creation, manual stock-in on restock
- Low-stock alerts per branch
- Data model built so product variants can be added later without rebuilding inventory (not built in v1)

*Customers*
- Optional customer profiles. No sale requires one.
- Customer search, filtering, and pagination
- CSV import of an existing customer list, processed in batches and validated before committing records
- Duplicate detection, data validation on import, segmentation, and customer groups deferred to V2

*People and payroll*
- Staff list per branch with role: Owner, Manager, Staff
- Payroll log per staff member: employee, pay period, salary amount, payment status, feeding into expense totals. Record only, no money moves.
- A structured audit log recording actor, business, branch, resource, previous value, new value, and timestamp for every security-sensitive or materially important change

*Reports and AI*
- Dashboard with today's sales, week's sales, profit and loss, low-stock count, filterable by branch or combined
- CSV and PDF export of reports and invoices
- AI assistant, scoped to the business's own data, the asking user's branch access, and the asking user's role
- For structured, numeric questions, the pipeline runs a direct database query and calculation first, then uses the AI model only to explain the result in plain language
- Vector-based retrieval is included in v1, but scoped specifically to unstructured business information (notes, uploaded documents, product descriptions), never used for numeric or financial totals, and never a way to bypass branch or role filtering
- AI clearly distinguishes a calculated fact, an estimate or prediction, and a case where there isn't enough data to answer reliably
- AI inventory prediction, clearly labeled as an estimate

*Platform*
- In-app and email notifications only
- Subscription and billing placeholder screen, with a default free test plan created automatically at signup
- Settings: business info, branches, currency (view only for the business), staff, notification preferences
- Help and support: FAQ plus direct message to the platform team
- Platform Admin Console: businesses, users, branches, subscriptions, usage, support, onboarding status, basic system health, currency correction tool
- Founder Dashboard, limited to metrics that can be calculated from real captured data: signups, total and active businesses, onboarding completion and drop-off, feature usage, AI usage, branch usage, customer import usage, report and export usage, retention where enough history exists
- Product usage analytics using a defined event taxonomy, separate from the audit log
- Nigerian data protection and security practices applied from the start of the real-data pilot, not deferred

**Out of Scope for v1**
- Real payroll disbursement
- SMS notifications
- Multi-currency and tax or VAT calculation beyond what Nigeria requires
- Product variants (size, color, flavor)
- Batch numbers, expiry dates, expiry alerts, first-expiry-first-out logic
- Multiple warehouses, warehouse transfers
- Purchase orders and supplier management
- Business wallet, payroll payments, supplier payments, bank integrations, reconciliation
- Real subscription billing (the MVP subscription stays a free test placeholder)
- Customer duplicate detection, data validation, segmentation, and customer groups
- Full offline mode
- Regional Manager role and UI
- Advanced enterprise permissions
- Advanced Founder Dashboard financial and marketing metrics (MRR, ARR, CAC, LTV, ARPU, ad spend, burn rate, runway) until real billing and marketing data exist
- API access and third-party integrations
- A user-facing history screen for the audit log

**Note on Real Payment Collection**
An earlier internal decision (recorded separately) placed real payment collection outside V2 and into a later, unscheduled version. That decision is being deliberately overridden here: real payment collection is now planned for V2, specifically through Flutterwave. Naming a specific provider, rather than leaving it as candidates, is a stronger signal that this override is a deliberate decision rather than an accidental scope change, so this is treated as settled.

## Functional Requirements

**Account and business setup**
1. A user can create an account with an email and password.
2. A user can log in and log out.
3. A new account must complete business onboarding before accessing the dashboard: business name, business type, currency, contact info.
4. A business can have one or more branches, each with a name, address, and contact info.
5. An owner can edit the business profile at any time.
6. Currency is set once during onboarding and cannot be changed by the business afterward. If set incorrectly, only a Platform Admin can correct it.
7. A Manager or Staff account cannot be created without exactly one associated branch-access record. This is checked at account creation time in the API layer.
8. An Owner can view company-wide, combined data or switch to a single branch view at any time.
9. Every protected action resolves the authenticated user, their business, their role, and their branch access before running, per the Authorization Model above. Client-supplied authorization values are never trusted.

**Money in and out**
10. A user with branch access can create an invoice with one or more items, quantities, and prices. A customer and a payment method are both optional.
11. An invoice has a status of Paid, Unpaid, or Partial, set manually by an authorized role. A quick walk-in sale is an invoice created with no customer, defaulting to Paid. Every status change is recorded in the audit log with actor, previous value, new value, and timestamp.
12. A user can log an income entry not tied to an invoice, with amount, date, branch, and an optional customer link.
13. A user can log an expense entry with category, amount, date, note, and branch.
14. Every payroll entry logged for a staff member is included as an expense in that branch's profit and loss calculation.
15. The system computes profit and loss per branch, and combined across all branches for the Owner role, from recorded income and expenses, including payroll, over a selected period.
16. Invoice amounts must follow defined numeric validation rules (non-negative, matching item totals). Payment status must use only the predefined values.

**Stock**
17. A user with branch access can add a stock item with name, SKU or product code, quantity, cost price, selling price, and reorder threshold.
18. Every stock change is recorded as a distinct stock-in or stock-out movement, forming a basic stock history for that item.
19. Stock quantity decreases automatically, as a stock-out movement, when an invoice item is created against it.
20. A user can manually record a stock-in movement to log a restock. This is recorded in the audit log.
21. The system displays a low-stock alert when a stock item's quantity falls at or below its reorder threshold.

**Customers**
22. A user with branch access can optionally create a customer profile with name and contact info. No sale requires one.
23. The system tracks purchases and amount owed only for transactions linked to an identifiable customer, scoped to the branch the customer belongs to.
24. A user can search and filter the customer list, with results paginated.
25. A user can import a customer list from a CSV file. Imports are processed in batches and validated before records are committed. Duplicate detection is deferred to V2.

**People and payroll**
26. An owner can add a staff member, assign them a branch-access record, and set their role to Owner, Manager, or Staff.
27. An owner can log a payroll entry for a staff member, specifying the employee, pay period, salary amount, and payment status. No payment is processed. This is recorded in the audit log and included in expense totals.
28. Only an Owner can create or modify payroll records.
29. A Staff role can view and create sales and invoices for their assigned branch only, and can view stock quantities for their assigned branch on a read-only basis. Staff cannot add, edit, remove, or transfer stock records.
30. A Manager role can view and manage sales, invoices, stock, and customers for their assigned branch only.
31. An Owner role can view and manage all data across all branches.

**Reports and AI**
32. The dashboard displays today's sales, week's sales, profit and loss, and low-stock count, filterable by branch, with a combined view available to the Owner role only.
33. A user can export a report or invoice as CSV or PDF.
34. A user can ask the AI assistant plain-language questions, including profit for a period, sales totals, best-selling and most profitable products, why profit changed compared to a prior period, who owes money, which products are low, and when stock is likely to run out.
35. For each structured question above, the system runs a direct database query and calculation first, and uses the AI model only to explain the result. The AI model never independently generates these figures.
36. For questions involving unstructured business information (notes, uploaded documents, product descriptions), the system may use a scoped vector search, filtered to the same business, branch, and role restrictions as every other data access.
37. The AI assistant clearly labels its answer as a calculated fact, an estimate, or a statement that there isn't enough data to answer reliably, and never presents a weak prediction as a certain conclusion.
38. Answers are filtered to both the branches and the specific data types the asking user's role is allowed to see, whether the answer comes from a structured query or a vector search.

**Platform basics**
39. The system sends notifications in-app and by email only.
40. A business has a subscription record created automatically at signup, showing a default free test plan, a price of zero, and a renewal date, clearly labeled as a placeholder.
41. An owner can edit business settings: business info, branches, staff, notification preferences. Currency is view only.
42. A user can view an FAQ and send a direct message to the platform team.

**Platform Admin Console and Founder Dashboard**
43. A platform account can log in to a console entirely separate from the SME app, at a separate route or subdomain.
44. A platform account with Admin capability can view registered businesses, branches, users, subscriptions, usage, support messages, onboarding status, and basic system health, and can correct a business's currency if entered incorrectly.
45. A platform account with Founder capability can view everything Admin capability allows, plus signups over time, active businesses, and businesses by plan.
46. Neither capability grants access to any business's financial, stock, or customer data. This is a separate, explicit authorization that is not built in v1.
47. Financial and marketing metrics requiring real billing or ad-spend data (MRR, ARR, CAC, LTV, ad spend, burn rate, runway) are not built in v1, since there is no real data to source them from.

## AI and AI-Related Tools and Solutions

**AI assistant**
A chat interface where a user types a question and receives a plain-language answer, using only data the asking user's business, branch, and role authorize. It does not use data from another business, and does not pull from the internet. It answers only when asked.

**Answering structured questions**
`User question → Authorization check → Database query → Business calculation → AI explanation`

The AI model explains an already-computed, authoritative result. It never independently calculates or invents a financial figure. This keeps every number traceable to the same calculation used elsewhere in the app.

**Answering unstructured questions**
Vector-based retrieval is included in v1, but only for genuinely unstructured business information, such as free-text notes, uploaded documents, or product descriptions, where a direct query cannot reasonably answer the question. It is never the default path for a numeric or financial question, and it is never a way to retrieve data outside the asking user's authorized scope. Structured and vector approaches may be combined in a single answer when appropriate (for example, a calculated total plus a relevant note about that period).

**Data sufficiency**
The assistant distinguishes three states: a calculated fact, an estimate or prediction, and insufficient data. When data is insufficient, it says so directly, for example: "I don't have enough sales history to make a reliable prediction yet." It never presents a weak prediction as a certain conclusion.

**Guardrails and failure handling**
The assistant runs under a fixed system instruction restricting it to the business data and computed results provided to it, and refuses off-topic questions or attempts to override its instructions. If the AI service fails or is rate-limited, the assistant shows a plain error message and does not block access to core business records. AI availability is never a requirement for using invoices, sales, inventory, or financial records.

**AI provider**
Gemini Free tier is the confirmed AI provider. This closes what was previously an open evaluation between Claude, OpenAI, DeepSeek, and Gemini. The AI feature is still built behind an internal AI service layer (`Operafrika → AI Service Layer → Gemini`) so a future provider change, if ever needed, does not require rebuilding the feature itself.

Gemini's free tier is rate-limited per project and the limits vary by which Gemini model is targeted. Published figures for this have shifted over time, so any specific number should be treated as a starting estimate, not a fixed fact, and checked directly at ai.google.dev before relying on it. This should be confirmed, and a specific Gemini model chosen, before scaling AI usage (both structured Q&A and pgvector-backed unstructured search) to the full 20 to 50 business pilot. It does not block starting the build.

**Data boundaries for all AI features**
- Allowed: that business's own invoices, expenses, income entries, stock records, customer records, and approved unstructured content, filtered further by the asking user's role.
- Not allowed: any other business's data, internet data, market or industry benchmark data, and any data type the asking user's role does not permit them to see directly.

## Technical Architecture

The application is a single Next.js application handling both the user-facing pages and the API routes. TypeScript is used throughout. Prisma is the ORM layer, and PostgreSQL is the database.

**Components**
- Next.js frontend: separate route groups for the SME app (`/app`), the Platform Admin Console (`/admin`), and the Founder Dashboard (`/founder`), each with its own authentication check.
- Next.js API routes: enforce the authorization model above before any database query runs.
- Prisma client: typed database access from the schema below.
- PostgreSQL database, with Row Level Security policies as a second enforcement layer.
- AI service layer: runs the scoped database query and calculation for structured questions, and the scoped vector search for unstructured ones, then sends the result and question to the AI model for phrasing.

**Route-level isolation**
SME users can access `/app` only. Platform accounts can access `/admin` and `/founder` only, and never `/app`. This is enforced server-side on every request, not by hiding navigation links.

**Branch access model**
Instead of a single fixed branch field on a user, branch access is stored as its own set of records, linking a user to one or more branches. In v1, Manager and Staff accounts are each linked to exactly one branch, enforced at account creation. Owner accounts hold no branch-access records and are authorized for every branch in their business by role alone. This structure allows a future Regional Manager role, linked to several branches, without changing the underlying model.

**Platform account model**
A single `PlatformUser` account type holds two independent capability flags (Admin console access, Founder dashboard access), rather than a single fixed role. Initially, one person holds both. This allows adding platform staff with only one capability later without a schema change. A platform account is never automatically granted access to any business's data.

**Audit logging**
Every security-sensitive or materially important change (invoice status, invoice edits, stock movements, payroll changes, staff changes, permission changes, and customer record changes where appropriate) is recorded with actor, business, branch, resource type, resource ID, previous value, new value, and timestamp. This is the authoritative accountability record. A simplified, user-facing activity history screen is a future, not v1, feature.

**Product analytics**
Separate from the audit log. Used to understand activation, feature adoption, engagement, retention, and onboarding, using a fixed event taxonomy (see Analytics Event Taxonomy). Analytics events never carry sensitive personal or financial values beyond what a defined product question requires.

**Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  MANAGER
  STAFF
}

enum InvoiceStatus {
  PAID
  UNPAID
  PARTIAL
}

enum StockMovementType {
  IN
  OUT
}

enum AuditAction {
  INVOICE_CREATED
  INVOICE_UPDATED
  INVOICE_STATUS_CHANGED
  STOCK_MOVEMENT_RECORDED
  PAYROLL_RECORD_CREATED
  PAYROLL_RECORD_UPDATED
  STAFF_CHANGED
  CUSTOMER_RECORD_CHANGED
  ROLE_PERMISSION_CHANGED
  CURRENCY_CORRECTED
}

model Business {
  id           String        @id @default(cuid())
  name         String
  businessType String
  currency     String        @default("NGN")
  contactInfo  String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  branches     Branch[]
  subscription Subscription?
  users        User[]
}

model Branch {
  id             String          @id @default(cuid())
  businessId     String
  business       Business        @relation(fields: [businessId], references: [id])
  name           String
  address        String?
  contactInfo    String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  branchAccess   BranchAccess[]
  customers      Customer[]
  stockItems     StockItem[]
  invoices       Invoice[]
  incomeEntries  IncomeEntry[]
  expenseEntries ExpenseEntry[]
}

model User {
  id              String           @id @default(cuid())
  email           String           @unique
  passwordHash    String
  role            Role
  businessId      String
  business        Business         @relation(fields: [businessId], references: [id])
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  branchAccess    BranchAccess[]
  payrollEntries  PayrollEntry[]
  supportMessages SupportMessage[]
  auditLogEntries AuditLog[]
}

// Manager/Staff get exactly one row in v1. Owner gets none (full bypass by role).
// A future Regional Manager can hold several rows without a schema change.
model BranchAccess {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  branchId  String
  branch    Branch   @relation(fields: [branchId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, branchId])
}

model PlatformUser {
  id                    String   @id @default(cuid())
  email                 String   @unique
  passwordHash          String
  canAccessAdminConsole Boolean  @default(true)
  canAccessFounderDashboard Boolean @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Customer {
  id            String        @id @default(cuid())
  branchId      String
  branch        Branch        @relation(fields: [branchId], references: [id])
  name          String
  contact       String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  invoices      Invoice[]
  incomeEntries IncomeEntry[]
}

model StockItem {
  id               String          @id @default(cuid())
  branchId         String
  branch           Branch          @relation(fields: [branchId], references: [id])
  name             String
  sku              String?
  quantity         Int
  costPrice        Decimal         @db.Decimal(14, 2)
  sellingPrice     Decimal         @db.Decimal(14, 2)
  reorderThreshold Int
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  invoiceItems     InvoiceItem[]
  stockMovements   StockMovement[]

  @@index([branchId])
}

model StockMovement {
  id               String            @id @default(cuid())
  stockItemId      String
  stockItem        StockItem         @relation(fields: [stockItemId], references: [id])
  type             StockMovementType
  quantity         Int
  reason           String
  relatedInvoiceId String?
  createdAt        DateTime          @default(now())

  @@index([stockItemId])
}

model Invoice {
  id            String        @id @default(cuid())
  branchId      String
  branch        Branch        @relation(fields: [branchId], references: [id])
  customerId    String?
  customer      Customer?     @relation(fields: [customerId], references: [id])
  status        InvoiceStatus @default(UNPAID)
  paymentMethod String?
  paymentAmount Decimal?      @db.Decimal(14, 2)
  paymentDate   DateTime?
  total         Decimal       @db.Decimal(14, 2)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  items         InvoiceItem[]

  @@index([branchId])
}

model InvoiceItem {
  id          String    @id @default(cuid())
  invoiceId   String
  invoice     Invoice   @relation(fields: [invoiceId], references: [id])
  stockItemId String
  stockItem   StockItem @relation(fields: [stockItemId], references: [id])
  quantity    Int
  price       Decimal   @db.Decimal(14, 2)
}

model IncomeEntry {
  id         String    @id @default(cuid())
  branchId   String
  branch     Branch    @relation(fields: [branchId], references: [id])
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id])
  amount     Decimal   @db.Decimal(14, 2)
  date       DateTime
  note       String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([branchId])
}

model ExpenseEntry {
  id        String   @id @default(cuid())
  branchId  String
  branch    Branch   @relation(fields: [branchId], references: [id])
  category  String
  amount    Decimal  @db.Decimal(14, 2)
  date      DateTime
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([branchId])
}

model PayrollEntry {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  payPeriod    String
  salaryAmount Decimal  @db.Decimal(14, 2)
  status       InvoiceStatus @default(UNPAID)
  datePaid     DateTime?
  createdAt    DateTime @default(now())
}

model Subscription {
  id          String   @id @default(cuid())
  businessId  String   @unique
  business    Business @relation(fields: [businessId], references: [id])
  planName    String   @default("Free (Test Period)")
  price       Decimal  @default(0) @db.Decimal(14, 2)
  renewalDate DateTime
}

model SupportMessage {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  message   String
  createdAt DateTime @default(now())
  resolved  Boolean  @default(false)
}

model AuditLog {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  businessId    String
  branchId      String?
  action        AuditAction
  resourceType  String
  resourceId    String
  previousValue Json?
  newValue      Json?
  metadata      Json?
  createdAt     DateTime    @default(now())

  @@index([businessId])
}

model AnalyticsEvent {
  id         String   @id @default(cuid())
  eventType  String
  userId     String?
  businessId String?
  branchId   String?
  sessionId  String?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([eventType])
}
```

## Vector Database Architecture and Design

Vector-based retrieval is part of the v1 AI architecture, scoped narrowly to unstructured business information: free-text notes, uploaded documents, and product descriptions. It is not used for numeric or financial questions, which always go through direct database queries instead.

PostgreSQL's pgvector extension, run on the same PostgreSQL instance, is the confirmed vector storage choice, avoiding a second external service and a second free-tier limit to track. Prisma does not have full native support for vector columns, so vector storage and similarity search are handled through raw SQL queries executed from the AI service layer.

Every vector record is tagged with the business, branch, and content type it belongs to. A similarity search always filters on `businessId`, `branchId` where applicable, and the asking user's role, before ranking runs. A search must never return a match from a different business, an unauthorized branch, or a data type the asking user's role does not permit.

## Vector Database Model

**What gets embedded**
- Free-text notes on expenses, income entries, or customers
- Uploaded business documents, where supported
- Product descriptions
- Any other unstructured business text approved for retrieval

**Metadata stored with each embedding**
- `businessId`
- `branchId`
- `contentType`
- `recordId`
- `date`

**Embedding freshness**
Whenever a source record is updated, its embedding is regenerated and the old one replaced.

**Query flow**
1. A user submits a question.
2. The system determines whether the question needs a structured query (default) or an unstructured lookup.
3. If unstructured, the question is converted into a vector.
4. A similarity search runs, filtered to the user's `businessId`, `branchId`, and role-permitted content types.
5. Matching records are pulled from PostgreSQL by `recordId`.
6. This is passed to the AI model as context, alongside any structured result, under the fixed system instruction.

## Analytics Event Taxonomy

Product analytics events are distinct from audit log events. Audit events answer "who changed what." Analytics events answer "how is the product being used."

**Standard event fields:** `eventType`, `timestamp`, `userId`, `businessId` (nullable), `branchId` (nullable), `sessionId`, `metadata`. Sensitive personal or financial values are never placed in event metadata without a defined product need.

**Canonical event types**

| Category | Events |
|---|---|
| Authentication | `user_signed_up`, `user_logged_in`, `user_logged_out`, `password_reset_requested`, `password_reset_completed` |
| Business & onboarding | `business_created`, `business_profile_updated`, `branch_created`, `branch_updated`, `onboarding_started`, `onboarding_completed`, `onboarding_abandoned` |
| Sales | `sale_created`, `sale_updated`, `sale_cancelled` |
| Invoices | `invoice_created`, `invoice_updated`, `invoice_sent`, `invoice_paid`, `invoice_partially_paid`, `invoice_cancelled`, `invoice_status_changed` |
| Income & expenses | `income_recorded`, `income_updated`, `income_cancelled`, `expense_created`, `expense_updated`, `expense_cancelled` |
| Inventory | `product_created`, `product_updated`, `product_archived`, `stock_added`, `stock_removed`, `stock_adjusted`, `low_stock_triggered` |
| Customers | `customer_created`, `customer_updated`, `customer_archived`, `customer_import_started`, `customer_import_completed`, `customer_import_failed` |
| Staff | `staff_added`, `staff_updated`, `staff_deactivated` |
| Payroll | `payroll_record_created`, `payroll_record_updated`, `payroll_status_changed` |
| Reports & exports | `report_viewed`, `report_exported`, `data_export_requested`, `data_export_completed` |
| AI | `ai_question_asked`, `ai_response_generated`, `ai_response_failed`, `ai_feature_used`, `ai_prediction_generated` |
| Subscription | `trial_started`, `subscription_started`, `subscription_upgraded`, `subscription_downgraded`, `subscription_cancelled`, `subscription_expired` |
| Engagement | `dashboard_viewed`, `notification_viewed`, `notification_clicked` |

Naming rules: lowercase snake_case, past tense, one event name per action, and a new event is only added when it answers a defined analytics question.

## Business Model

**MVP subscription**
Every business gets a default subscription record created automatically at signup: a free test plan, a price of zero, and a renewal date. Clearly labeled as a placeholder. No live payment processing occurs in v1.

**Future commercial subscription model (not implemented in MVP)**
A five-tier structure is the initial pricing hypothesis, not locked pricing:

| Plan | Initial price hypothesis |
|---|---:|
| Free | ₦0/month |
| Starter | ₦7,500/month |
| Growth | ₦15,000/month |
| Business | ₦35,000/month |
| Enterprise | Custom (Contact Sales) |

These prices must be validated through competitor research, SME interviews, current tool spending, willingness-to-pay discussions, and controlled pricing experiments before a real paid launch. Building the tiered billing system, and the real payment processing it depends on, is planned for V2.

The subscription record exists per business, not per branch, in v1.

## Success Metrics

**Usage metrics, with targets**
- At least 80 percent of the 20 to 50 test businesses complete onboarding and add at least one branch.
- At least 70 percent of businesses log at least one invoice or expense within the first seven days.
- At least 70 percent of branches have at least one stock item entered within the first seven days.
- At least 50 percent of active businesses ask the AI assistant at least one question per week by week three.
- At least 50 percent of Owner accounts check the combined dashboard view at least once per week.
- At least 60 percent of triggered low-stock alerts result in a restock logged within seven days.
- At least 40 percent of recorded sales have no customer profile attached, confirming the optional-customer model reflects real usage.
- All support messages receive a first response within 48 hours.
- At least 50 percent of businesses are still logging data weekly by the end of the test window.
- Zero confirmed cases of one business, branch, or role accessing data outside its authorized scope during the test period.

**Outcome metric**
- At least 60 percent of surveyed owners report, through an end-of-test survey, that the app saved them time or helped them catch a missed payment or stockout.

## Roadmap

**MVP (this document)**
Authentication, business onboarding, branches with a future-proof branch-access model, roles and permissions with server-side and database-level enforcement, sales and invoices with optional customers and payment status, income, expenses, payroll-aware profit and loss, simple inventory with SKU, cost, selling price, and stock movement history, low-stock alerts, customer search and CSV import, staff management, record-only payroll, an AI assistant backed by direct database queries with scoped vector retrieval for unstructured content, dashboard and reports, CSV and PDF export, test-period subscription, notifications, support, a structured audit log, a defined analytics event taxonomy, a Platform Admin Console, a basic Founder Dashboard, and Nigerian data protection practices applied from day one.

**V2, expand the operating system and enable real payments**
Real payment collection through Flutterwave, the confirmed provider, extending the existing invoice model (`Invoice → Payment Link → Flutterwave → Confirmation → Updated Payment Status`) without the platform holding customer or business funds beyond facilitating that flow. Also: product variants, better customer management, customer segmentation, purchase orders, suppliers, more advanced inventory, real subscription billing, advanced reports, more advanced AI, better notifications, offline support for critical operations (recording sales, viewing cached products, creating basic invoices, with sync and conflict handling on reconnect), and a fuller Founder Dashboard including real financial and marketing metrics once billing exists.

**V3, financial operations**
Business wallet, payroll payments, supplier payments, bank integrations, payment reconciliation, multiple warehouses, batch and expiry tracking, stock transfers, a Regional Manager role using the existing branch-access model, API access, integrations, and enterprise-level controls.

**V4, broader financial platform**
Longer-term direction only: business payments, wallet, payroll, supplier payments, financial intelligence, and potential financing or credit partnerships.

## Operational Policies

**Database capacity**
Pagination is required on customer, invoice, inventory, stock movement, and audit tables. Large CSV imports are processed in batches and validated before committing. Frequently queried fields are indexed. Storage, query performance, and import size are monitored throughout testing.

If capacity becomes constrained, the response order is: protect existing businesses and their data first, protect core business operations, reduce or rate-limit expensive non-critical operations, optimize queries and storage, upgrade infrastructure, and only as a last step, temporarily restrict new business registrations. Existing business data is never deleted or compromised to free up capacity.

**AI service fallback**
AI usage may be rate-limited independently from the rest of the product. If AI capacity is exhausted, core sales, invoices, inventory, and financial records remain fully available. AI availability is never a condition for accessing core business records.

Gemini's free tier limits vary by model and change over time. The actual limit for the specific Gemini model in use must be checked directly at ai.google.dev, and confirmed as sufficient for both structured Q&A and vector-search traffic across the full 20 to 50 business pilot, before AI usage is scaled to that level.

## Data Protection and Compliance

The pilot uses real Nigerian business data: real customers, staff, and financial records. Data protection is a day-one MVP requirement, not a later addition.

Required practices: data minimization, access control, authentication, authorization, encryption in transit, appropriate encryption and security controls at rest, secure secrets management, defined data retention and deletion practices, privacy notices, review of third-party processors, and support for data export and access requests.

The Nigeria Data Protection Act and relevant Nigeria Data Protection Commission requirements must be reviewed with qualified legal guidance before the real-data pilot scales beyond its initial size. This document is not legal advice and does not substitute for that review. If the product expands to another country, that country's data protection requirements must be assessed before operating there.

## Product Principles

1. Do not build complexity without evidence of customer need.
2. Do not trust the client for authorization.
3. Security boundaries must exist on the server and in the database, not only in the UI.
4. Business calculations are based on authoritative transaction data, never on whether a customer profile exists.
5. Customer profiles are never required for a sale.
6. The AI must never invent a financial figure.
7. The AI only retrieves data the requesting user is already authorized to access.
8. Structured queries answer structured business data; vector retrieval is reserved for genuinely unstructured content.
9. Do not make future financial services a dependency of the MVP.
10. Design the data model for future multi-branch expansion without building every advanced feature now.
11. Protect existing businesses before optimizing for new signups.
12. Do not display an analytics metric that cannot be reliably calculated from real data.
13. Treat pricing as a hypothesis until validated with real businesses.
14. Every security-sensitive action must be traceable to an actor and a timestamp.
15. Review a new country's regulatory and data protection requirements before expanding there.

## Remaining Implementation and Validation Decisions

Three of the original six items here are now resolved: AI provider (Gemini Free tier), vector storage implementation (pgvector), and confirmation of the Real Payment Collection override (Flutterwave, named specifically). What remains:

- **Exact database and infrastructure tier** — deliberately not decided yet, skipped for now. A local, throwaway development Postgres instance is fine for building. A hosting provider (Supabase, Neon, Railway, or similar) must be chosen before running migrations against anything persistent or shared, since Prisma needs a live `DATABASE_URL`.
- **Gemini free-tier rate limits for the target model** — a new, more specific item replacing the old open provider choice. Confirm the actual per-project limits at ai.google.dev for whichever Gemini model is used, and verify they hold up under the full 20 to 50 business pilot's combined structured Q&A and vector-search load.
- **Exact Nigerian legal and privacy controls** — confirmed with qualified legal guidance before the pilot scales.
- **Exact commercial pricing** — validated through customer and market testing before any paid launch.
