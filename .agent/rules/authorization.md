---
trigger: always_on
---

# Authorization

Rules controlling who can do what, and how that is enforced. This is the single source of truth for access. Do not infer a permission that is not listed here.

Rule: Every protected request resolves the authenticated user, their business, their role, and their authorized branch before running.
Reason: The system serves many businesses from one codebase. Skipping this step is how one business ends up seeing another business's data.

Rule: Client-supplied business, branch, or role values are never trusted.
Reason: A client value can be edited by anyone with basic tools. Only the server session may set these values.

Rule: Authorization runs on two independent layers. The server checks the request before it reaches the database. PostgreSQL Row Level Security checks the query again, independently, using policies scoped to business and branch.
Reason: If the server check is missed on one route, the database layer still blocks the wrong result. One layer alone is not enough.

Rule: The UI hides actions and screens the user cannot perform, but this hiding is never treated as security. Removing a button from a screen does not remove the underlying access.
Reason: A hidden button can be bypassed by a direct API call. Only the two layers above are real boundaries.

Rule: Owner accounts hold no branch-access record. An Owner is authorized for every branch in their business by role alone.
Reason: Owner access is total by design, not because of a list of branches.

Rule: Manager and Staff accounts must have exactly one branch-access record, checked at account creation. An account cannot be created without it.
Reason: A Manager or Staff account with no branch, or more than one branch, breaks the branch scoping every other rule depends on.

Rule: Permission Matrix, by role and resource.
- Business profile: Owner reads and updates. Manager and Staff read only.
- Branches: Owner reads, creates, updates across the business. Manager and Staff read their own branch only.
- Sales and invoices: Owner reads, creates, updates, and cancels across all branches. Manager does the same for their own branch. Staff reads and creates for their own branch only, no update or cancel.
- Expenses and income: Owner and Manager read, create, and update within their scope. Staff has no access.
- Inventory: Owner and Manager read, create, and update within their scope. Staff has read-only access within their own branch, and cannot add, edit, remove, or transfer stock.
- Customers: Owner and Manager read, create, and update within their scope. Staff reads and creates within their own branch, no update.
- Staff records: Owner manages all staff across all branches. Manager reads their own branch's staff list. Staff has no access.
- Payroll: Owner only, across all branches. Manager and Staff have no access, in any form, including through the AI assistant.
- Reports and exports: Owner exports everything. Manager exports their own branch. Staff exports sales and invoices for their own branch only.
- Settings: Owner has full access. Manager has read-only view. Staff has no access. Currency correction is Platform Admin only, not any SME role.
Reason: This table is the current, agreed answer to every access question in the app. Changing it is a product decision, not a coding one.

Rule: Before this feature ships, run these six checks. Owner reaching every branch they own. Manager and Staff failing to reach a branch they are not assigned to. Any user failing to reach another business's data. A direct API call without the UI failing the same way a UI action would. A manipulated businessId, branchId, or role value from the client being ignored, not honored. An AI assistant request failing the same way as a direct API call when it tries to reach unauthorized data.
Reason: These are the specific failure modes this system must never allow. Each one needs an explicit test, not an assumption that the general rule covers it.