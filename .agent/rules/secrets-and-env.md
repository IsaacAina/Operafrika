---
trigger: model_decision
description: Apply when adding, reading, or wiring in any credential, API key, database connection string, or environment variable, or connecting to any external service.
---

# Secrets and Environment

Rules controlling credentials and configuration.

Rule: No secret is ever hardcoded in source code.
Reason: Hardcoded secrets end up in version history permanently, even after they are removed from the current file.

Rule: Secrets are read from environment variables only.
Reason: This keeps secrets out of the codebase and lets different environments use different values safely.

Rule: The known secret categories in this project are the database connection string, the Gemini API key, and the Flutterwave credentials for V2.
Reason: Naming the categories here, without their actual values or variable names, gives the agent a checklist without exposing anything.

Rule: If a required secret is missing when the application starts, the application fails to start with a clear error. It does not run with the dependent feature silently disabled.
Reason: A feature that quietly doesn't work because of a missing key is harder to diagnose than a startup failure that states the problem plainly.

Rule: No secret is ever written to a log, an error message, or a committed file, including .env files.
Reason: A secret in a log is as exposed as a secret in code. Log output is often less carefully protected than source control.

Rule: A new secret or a new environment variable is never added without asking first.
Reason: A new credential usually means a new external service has been wired in, which is a decision, not a routine step.