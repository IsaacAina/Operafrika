---
trigger: model_decision
description: Apply when creating or editing a Prisma model, migration, or field, or when writing any query that creates or updates a database record. Covers branch-access rows, money field precision, stock movement records, and indexing.
---

# Schema

Rules controlling how data is modeled in Prisma and PostgreSQL. This file does not repeat authorization rules. See rules/authorization.md for who can access what.

Rule: Every table holding business data carries a branchId foreign key.
Reason: Branch is the unit of isolation for almost all data in this product. A table without it cannot be scoped correctly.

Rule: Branch access for a user is stored in a separate BranchAccess table, linking userId to branchId, not as a single field on the user.
Reason: This lets a future role hold access to more than one branch without changing the table structure later.

Rule: Owner accounts get no BranchAccess rows. Manager and Staff each get exactly one.
Reason: See rules/authorization.md for why this access pattern exists. This file only states what the schema must support.

Rule: All money fields use Decimal with 14 total digits and 2 decimal places.
Reason: Floating point numbers lose precision on money. A fixed decimal type avoids rounding errors in profit and loss.

Rule: Every stock change is written as its own StockMovement row, typed IN or OUT, not as an update to the stock quantity alone.
Reason: A single quantity field cannot answer what happened and when. Movement history is a stated product requirement, not an optional log.

Rule: Frequently filtered fields, especially branchId, are indexed.
Reason: Every query in this product filters by branch. An unindexed branchId column will slow down as data grows.

Rule: Row Level Security policies are written as raw SQL inside Prisma migration files, since Prisma has no native syntax for defining RLS policies.
Reason: Without this, the Row Level Security layer required by rules/authorization.md has no defined way to actually get built.

Rule: The AuditLog table stores previousValue and newValue as JSON, not as separate typed columns per field.
Reason: Many different types of records get audited. A generic value pair avoids building one audit table per resource type.

Rule: The AnalyticsEvent table is a separate model from AuditLog.
Reason: These two tables answer different questions and must never merge. See rules/audit-logging.md and rules/analytics-events.md for what each one is for.

Rule: The PlatformUser table is separate from the User table, with no relation between them.
Reason: See rules/platform-boundary.md for why this separation exists. This file only states what the schema must support.

Rule: The Subscription table has one row per business, not per branch.
Reason: See rules/business-model.md for why billing works this way. This file only states what the schema must support.

Rule: Do not add a table, column, or relation that is not named in this file or in the PRD without asking first.
Reason: An unrequested schema change is a silent, permanent decision. It must be a visible one instead.