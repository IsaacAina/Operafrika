---
trigger: model_decision
description: Apply when implementing account closure, deletion, purging, retention, or the scheduled job that removes records whose grace period has ended.
---

# Account Deletion

The rules below govern how an account is closed and how its data is removed. They cover the three stages: soft delete, grace period, hard delete. See rules/compliance.md for the wider retention and deletion obligation.

Rule: Deletion is a request followed by a wait, not an immediate erase. Closing an account sets `User.deletedAt` and `User.deletionScheduledFor`; it never deletes rows in the same request.
Reason: A sign-up, an angry click, or a compromised session must not be able to destroy financial records in one step. The grace period is the safety window.

Rule: The grace period is 30 days by default and is read from `ACCOUNT_DELETION_GRACE_DAYS`. The deadline is stored on the row, never computed from "now minus N days".
Reason: A stored deadline survives a missed job run, a redeploy, or a job that starts late. A computed one silently extends or shortens the window.

Rule: The account stops working the moment it is scheduled. Every session is revoked immediately, the sign-in route refuses the account, and the session resolver treats it as invalid.
Reason: "Scheduled for deletion" must mean closed, otherwise the account stays usable during the window and the closure is fiction.

Rule: Only the account owner can schedule the deletion of their own account. It is not an administrative bulk action and it is not reachable with a business or user id from the client.
Reason: The acting account comes from the server session, never from the request body.

Rule: When the account is the last active owner of its business, the business is scheduled for deletion in the same window (`Business.deletedAt`, `Business.deletionScheduledFor`). The confirmation email and the account page both state this before it happens.
Reason: A business with no owner cannot be administered. Leaving it behind strands its records with nobody able to reach them.

Rule: Cancelling during the grace period needs the one-time token from the deletion email. Only the token's SHA-256 hash is stored, and the token is cleared once used.
Reason: The same reason session tokens are hashed: a leaked table must not let someone resurrect or cancel an account. Single use stops a link from being replayed.

Rule: Cancelling clears the account markers, clears the business markers when an active owner exists again, and writes an audit entry. It does not restore revoked sessions.
Reason: The account is safe, but the owner signs in again to get a new session. Restoring old tokens would undo the revocation that the closure required.

Rule: The hard delete runs from one implementation, `lib/account-deletion.ts`, reached by two entry points: the daily job (`scripts/purge-scheduled-deletions.mjs`) and the guarded route (`POST /api/cron/account-deletions`).
Reason: Two copies of the purge logic drift and one of them gets it wrong. The route refuses to run unless `CRON_SECRET` is configured and the bearer token matches.

Rule: The purge only touches rows whose `deletionScheduledFor` has passed. It is idempotent and safe to run more than once, and one failure does not stop the rest of the run.
Reason: A scheduler may double-run, restart mid-run, or run late. Each of those must be harmless, and a single bad row must not block every other due deletion.

Rule: A purge runs in a transaction per account or business. Partial deletion is not a valid state.
Reason: Half a business left behind is worse than a failed attempt that is retried on the next run.

Rule: Accounts belonging to a business that is itself scheduled are left to the business purge. They are not purged on their own.
Reason: If the business purge fails after its accounts are gone, the business is stranded without an owner. Leaving the accounts in place keeps the retry able to complete.

Rule: Business records outlive the person. Audit entries and payroll entries keep their content and lose only the link to the deleted account; the audit entry also keeps an `actorEmail` snapshot. Personal rows (sessions, branch access, verification codes, reset tokens, support messages) are cascade-deleted with the account.
Reason: The business's accountability and financial history belongs to the business. The person's own login and support artefacts belong to the person.

Rule: When a business is purged, its audit entries are deleted except the entries that record the deletion itself. A final `ACCOUNT_DELETION_PURGED` entry states what was erased.
Reason: A record of the erasure must survive the erasure, or there is no way to answer "was this business deleted, and when".

Rule: The purge never sends email and never depends on email. A failed confirmation email does not cancel or undo a deletion; the request reports that the email did not go out.
Reason: The mail server is a third party. It must not be able to hold an API request open or reverse a state change that already committed.
