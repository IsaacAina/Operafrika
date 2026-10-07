---
name: scaffold-branch-scoped-resource
description: Use when adding a new SME-facing business resource, such as invoices, expenses, income, stock, customers, staff, or payroll, that must be scoped to a branch and enforced through the Permission Matrix.
---

# Scaffold a Branch-Scoped Business Resource

Follow these steps in order for any new resource that belongs to a branch.

1. Add the Prisma model with a branchId field, following the conventions in .agent/rules/schema.md. Confirm the model appears in schema.prisma before continuing.
2. Add an index on branchId if the resource will be queried by branch, per .agent/rules/schema.md.
3. Apply the migration that creates this model and its index. Follow the confirmation rule in AGENTS.md for any migration against a persistent or shared database, and the command visibility and confirmation rules in .agent/rules/command-execution.md. Confirm the migration file exists and the model is reachable through the Prisma client before continuing.
4. Write the API route so it resolves the authenticated user, their business, their role, and their branch from the server session before any database call, per .agent/rules/authorization.md. Confirm no route reads business, branch, or role from client input.
5. Look up this resource's row in the Permission Matrix in .agent/rules/authorization.md. Implement exactly the actions listed for Owner, Manager, and Staff, and no others.
6. Check whether this resource's create, update, or status-change actions appear in the audited-actions list in .agent/rules/audit-logging.md. If they do, write the audit entry in the same transaction as the change, using the structure defined there.
7. Build the UI so it only displays data for the branches the signed-in user is authorized to see, with a combined view available only where the Permission Matrix allows it.
8. Run the six required authorization tests from .agent/rules/authorization.md against the new route before marking this resource complete.

Each step is done when the file, route, or test it describes exists and passes review. Do not skip a step because a similar resource already exists. Repeat the full sequence for each new resource.