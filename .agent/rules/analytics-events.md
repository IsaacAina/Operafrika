---
trigger: model_decision
description: Apply when adding tracking, logging a user action, or instrumenting a new event for usage or engagement purposes. Not the same as the audit log.
---

# Analytics Events

Rules controlling product usage tracking. This is not the accountability log. See rules/audit-logging.md for that.

Rule: Every analytics event uses this list.
- Authentication: user_signed_up, user_logged_in, user_logged_out, password_reset_requested, password_reset_completed.
- Business and onboarding: business_created, business_profile_updated, branch_created, branch_updated, onboarding_started, onboarding_completed, onboarding_abandoned.
- Sales: sale_created, sale_updated, sale_cancelled.
- Invoices: invoice_created, invoice_updated, invoice_sent, invoice_paid, invoice_partially_paid, invoice_cancelled, invoice_status_changed.
- Income and expenses: income_recorded, income_updated, income_cancelled, expense_created, expense_updated, expense_cancelled.
- Inventory: product_created, product_updated, product_archived, stock_added, stock_removed, stock_adjusted, low_stock_triggered.
- Customers: customer_created, customer_updated, customer_archived, customer_import_started, customer_import_completed, customer_import_failed.
- Staff: staff_added, staff_updated, staff_deactivated.
- Payroll: payroll_record_created, payroll_record_updated, payroll_status_changed.
- Reports and exports: report_viewed, report_exported, data_export_requested, data_export_completed.
- AI: ai_question_asked, ai_response_generated, ai_response_failed, ai_feature_used, ai_prediction_generated.
- Subscription: trial_started, subscription_started, subscription_upgraded, subscription_downgraded, subscription_cancelled, subscription_expired.
- Engagement: dashboard_viewed, notification_viewed, notification_clicked.
Reason: A fixed list keeps the Founder Dashboard's usage numbers consistent. An invented event name on one screen and a different name for the same action on another screen breaks every count built on top of them.

Rule: Event names are lowercase, use underscores, and are written in the past tense.
Reason: One consistent format keeps events predictable to query and to add to later.

Rule: One event name covers one action. Do not create a second name for something already on the list.
Reason: Duplicate names for the same action split the count of that action across two rows.

Rule: Analytics events are recorded from the server, not the client, whenever the event corresponds to a server-side action.
Reason: Client-side tracking can be blocked or missed. The Founder Dashboard's numbers must be trustworthy, so tracking should not depend on the client reliably reporting in.

Rule: A new event is only added when the product owner has asked a specific analytics question it would answer. The agent does not invent a new event on its own judgment.
Reason: Logging everything just in case produces noise that makes the real signal harder to find later, and an agent-invented event is exactly that kind of noise.

Rule: An analytics event never carries a financial amount, a customer name, or other sensitive personal detail in its metadata, unless a stated product question requires it.
Reason: Usage tracking is not the place to store sensitive records. That belongs in the actual business tables.