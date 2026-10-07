---
trigger: model_decision
description: Apply when building login, authentication, routing, or anything under the SME app, the Platform Admin Console, or the Founder Dashboard. Governs the separation between business accounts and internal Operafrika accounts.
---

# Platform Boundary

Rules controlling the separation between the SME product and the internal Operafrika tools.

Rule: The SME app, the Platform Admin Console, and the Founder Dashboard are three separate route groups, at /app, /admin, and /founder.
Reason: These serve different audiences with different access rules. Mixing routes makes it easy to leak one into the other.

Rule: SME accounts can only reach /app. Platform accounts can only reach /admin and /founder, never /app.
Reason: A business owner has no reason to be inside the internal tools, and an internal account has no reason to appear as a business user.

Rule: This boundary is enforced on the server for every request, not by hiding navigation links.
Reason: A hidden link is not a boundary.

Rule: Platform accounts authenticate through their own login route, separate from the SME login route. Neither route checks the other account table.
Reason: A shared login path that checks both tables is a bridge between the two account types. Separate routes keep the boundary real, not just conceptual.

Rule: Platform accounts are stored in their own table, separate from SME business accounts, with no relation between the two.
Reason: This makes it structurally impossible for a platform account to inherit a business role by accident.

Rule: A platform account has two independent capability flags, Admin Console access and Founder Dashboard access, instead of one fixed role.
Reason: The same person holds both today, but a future hire may only need one. Flags allow that without a schema change.

Rule: A platform account, with either capability, never gains access to any business's financial, stock, or customer data. This access does not exist in this version.
Reason: The internal tools exist to run the platform, not to inspect a customer's business.

Rule: Admin Console capability includes businesses, branches, users, subscriptions, usage, support messages, onboarding status, system health, and currency correction.
Reason: This is the operational surface needed to run the platform day to day.

Rule: Founder Dashboard capability includes everything Admin Console includes, plus signups over time, active businesses, and businesses by plan.
Reason: The Founder needs the operational view plus a company-level view on top of it.

Rule: MRR, ARR, CAC, LTV, ad spend, burn rate, and runway are not built into the Founder Dashboard in this version.
Reason: None of these can be calculated honestly without real billing and marketing data, which do not exist yet. A metric with no real data behind it is worse than no metric.