# Security + Dependency Hygiene

- Memory key: `Security + Dependency Hygiene`
- Primary skill: [`security-dependency-hygiene`](../../../.agents/skills/security-dependency-hygiene/SKILL.md)

## What It Does

Audits auth/data safety, secret handling, and dependency/supply-chain risk for changed code and release readiness.

## Trigger Skills

- `security-dependency-hygiene` (primary)
- Common companions: `periodic-scans`, `release-incident-response`

## Automation Entry Points

- No dedicated automation lane currently owns this workflow.
- Typically triggered during weekly scans, release prep, or dependency update reviews.

## How It Works

1. Validate authn/authz and ownership checks on mutating paths.
2. Verify concealment/error mapping and sanitization boundaries.
3. Scan changed/config paths for secret exposure patterns.
4. Review dependency changes, lockfile integrity, and vulnerability signals.
5. Produce remediation queue by severity and operational impact.

## Outputs

- Critical/high/medium-low security and hygiene findings.
- Deferred risks with owner and due date.
- Memory entry with workflow `Security + Dependency Hygiene`.
