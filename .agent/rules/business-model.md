---
trigger: model_decision
description: Apply when working on subscription records, pricing, plan tiers, billing screens, or the signup flow's default plan.
---

# Business Model

Rules controlling subscription and pricing.

Rule: Every business gets one subscription record, created automatically at signup, with a free plan, a price of zero, and a renewal date.
Reason: This is a placeholder for testing. No real billing happens in this version.

Rule: The five-tier structure, Free, Starter, Growth, Business, and Enterprise, with their stated example prices, is a hypothesis, not final pricing.
Reason: These numbers have not been tested against what real businesses will actually pay. Presenting them as final would be presenting a guess as a fact.

Rule: The subscription belongs to the business, not to a branch. A business with several branches has one subscription record.
Reason: This matches how the product is priced and sold, one account per business regardless of branch count.

Rule: Real subscription billing is not built in this version.
Reason: This is explicitly a V2 feature. See AGENTS.md, Not in scope for the MVP.

Rule: Pricing is not treated as final until it has been tested through competitor research, direct interviews with SME owners, and controlled pricing experiments.
Reason: A number written in a document is easy to mistake for a decision already made. Naming the actual validation steps prevents that number from being used before its validation is done.