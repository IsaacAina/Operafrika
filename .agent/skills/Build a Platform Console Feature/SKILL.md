---
name: build-platform-console-feature
description: Use when adding a new capability to the Platform Admin Console or the Founder Dashboard, such as a new list, metric, or action available only to internal Operafrika accounts.
---

# Build a Platform Console Feature

Follow these steps in order for any new internal-tool capability.

1. Confirm the feature belongs under /admin or /founder, not /app, per .agent/rules/platform-boundary.md.
2. Confirm which capability the feature needs, Admin Console access or Founder Dashboard access, against the two capability lists in .agent/rules/platform-boundary.md. Build the check for that capability into the route before any other logic runs.
3. Build the route so it never reads, joins, or displays any business's financial, stock, or customer data, per the explicit prohibition in .agent/rules/platform-boundary.md.
4. If the feature displays a metric, check it against the excluded metrics list in .agent/rules/platform-boundary.md (MRR, ARR, CAC, LTV, ad spend, burn rate, runway). Do not build any of these unless real billing or marketing data now exists.
5. If the feature needs usage data, source it only from event names already defined in .agent/rules/analytics-events.md. Do not invent a new event name to support this feature without adding it there first.
6. Confirm the feature is only reachable through the platform login route, never the SME login route, per .agent/rules/platform-boundary.md.

Each step is done when the check or restriction it describes is verifiably in place. Do not treat a hidden menu item as satisfying steps 1 through 3; the restriction must hold on the server.