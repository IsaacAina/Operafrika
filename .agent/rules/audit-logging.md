---
trigger: model_decision
description: Apply when writing code that changes an invoice status, adjusts stock, creates or edits a payroll record, changes staff or permissions, or corrects a business's currency. Governs what gets logged and how.
---

# Audit Logging

Rules controlling the accountability log. This answers who changed what. It is not the usage log. See rules/analytics-events.md for that.

Rule: These actions always create an audit entry: invoice status changes, invoice edits, stock movements, payroll record changes, staff changes, permission changes, customer record changes where relevant, and currency corrections.
Reason: These are the actions named as security-sensitive or materially important. If a business owner disputes one of these later, there must be a record.

Rule: Every audit entry stores the acting user, the business, the branch when relevant, the resource type, the resource id, the previous value, the new value, and the timestamp.
Reason: A log entry that says something changed without saying what changed is not useful for resolving a dispute.

Rule: The audit log is written by the server as part of the same action, not by a separate background process.
Reason: A background job can fail silently and leave an action unrecorded. Writing it inline guarantees the two happen together.

Rule: If writing the audit entry fails, the whole action fails and rolls back. A change is never saved without its audit entry.
Reason: An unaudited but successful change breaks the accountability guarantee this file exists for. A failed, visible error is better than a silent gap in the record.

Rule: The audit log is not exposed as a user-facing screen in this version.
Reason: This is explicitly out of scope for now. The data is captured so it can be surfaced later without a redesign.

Rule: The audit log never records why a change happened, only what changed and who changed it.
Reason: A free-text reason field is not reliably filled in. The what and who are enough to be useful.