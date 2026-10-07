---
trigger: model_decision
description: Apply when working on the Invoice model, invoice payment fields, or anything that resembles payment collection, checkout, or a Flutterwave integration. Confirms this is V2 scope, not to be built now.
---

# Payments

Rules controlling real payment collection through Flutterwave. This is a V2 feature. Do not build any part of it during MVP work.

Rule: Flutterwave is the locked payment provider for this product. No other payment provider is used.
Reason: This decision has already been made. Do not evaluate or suggest alternatives.

Rule: The payment flow is invoice, then a payment link, then Flutterwave, then a confirmation, then an updated invoice payment status.
Reason: This is the shape of the feature as planned. Building it out of this order creates a flow that does not match the rest of the invoice model.

Rule: The platform never holds customer or business funds. It only facilitates the connection between an invoice and Flutterwave.
Reason: Holding funds directly would turn this into a financial institution, with a different set of legal obligations than a facilitation service.

Rule: The Invoice model already has paymentMethod, paymentAmount, and paymentDate fields, built for this feature. Do not add new payment fields without checking this file first.
Reason: The groundwork for this feature already exists in the schema, so V2 does not require a redesign.

Rule: Do not remove the existing paymentMethod, paymentAmount, or paymentDate fields from Invoice, even though they are unused until V2 payment collection is built.
Reason: These fields are placeholders for the V2 feature. Removing them as unused would mean re-adding them later and could break invoice records created before V2 begins.

Rule: No payment collection code, route, or UI is built while the project is in its MVP phase.
Reason: Flutterwave being a locked stack choice is not the same as payment collection being in scope now. See AGENTS.md, Not in scope for the MVP.