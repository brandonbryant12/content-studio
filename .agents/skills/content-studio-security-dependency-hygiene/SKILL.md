---
name: content-studio-security-dependency-hygiene
description: Security and dependency hygiene workflow for auth/data safety, secret exposure prevention, and dependency risk control.
---

# Content Studio Security + Dependency Hygiene

Use this skill in weekly scans, before releases, and after dependency updates.

## Security Surfaces

- authentication and authorization flows
- user-owned resource access paths
- prompt/input sanitization boundaries
- secret handling in config and logs
- dependency and supply-chain risk

## Hygiene Flow

1. Validate authn/authz for changed mutating paths.
2. Validate concealment semantics and error mapping where required.
3. Scan for likely secret leakage patterns in changed files and config.
4. Review dependency changes:
   - intentionality
   - scope
   - compatibility
   - lockfile integrity
5. Run or review vulnerability checks (`pnpm audit` or equivalent CI output when available).
6. Propose remediations with severity and operational impact.

## Output Contract

1. Critical vulnerabilities/exposures
2. High-priority remediation tasks
3. Medium/low hygiene improvements
4. Deferred risks with owner and due date

Each item includes severity, exploitability, impact, and file/package evidence.

## Memory + Compounding

Record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "Security + Dependency Hygiene"` (prefer `node scripts/workflow-memory/add-entry.mjs`):

- vulnerable package or exposure pattern
- remediation taken
- prevention policy (pinning, lint/test rule, review checklist)
