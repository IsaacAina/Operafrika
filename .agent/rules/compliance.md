---
trigger: model_decision
description: Apply when handling personal or financial data, data export, data retention or deletion, encryption, or anything related to the Nigeria Data Protection Act.
---

# Compliance

Rules controlling data protection for the Nigerian pilot.

Rule: This pilot uses real business data: real customers, staff, sales, and financial records, from Nigerian businesses.
Reason: This is not a synthetic test dataset. Every rule below follows from that fact.

Rule: The product applies data minimization, access control, authentication, authorization, encryption in transit, encryption and security controls at rest, secure secrets management, defined data retention and deletion practices, privacy notices, review of third-party processors, and support for data export and access requests.
Reason: These are the baseline practices expected when handling real personal and financial data, not optional extras for later.

Rule: The Nigeria Data Protection Act and Nigeria Data Protection Commission requirements must be reviewed with qualified legal guidance before the pilot scales beyond the initial 20 to 50 business cohort.
Reason: Legal review has not happened yet. Scaling past the agreed pilot size before that review happens is scaling ahead of the compliance work meant to support it.

Rule: This file is not legal advice and does not replace that review.
Reason: Nothing in this project's documentation is a substitute for a qualified legal opinion on data protection law.

Rule: The agent never declares a feature compliance-complete on its own judgment. That sign-off comes only from the legal review named above.
Reason: An agent's own assessment of legal compliance is not a substitute for a qualified legal review, and stating otherwise would create false confidence in an unreviewed feature.

Rule: If the product expands to a country other than Nigeria, that country's data protection requirements must be assessed before operating there.
Reason: Compliance in one country does not carry over to another. Each expansion needs its own check, not an assumption of coverage.