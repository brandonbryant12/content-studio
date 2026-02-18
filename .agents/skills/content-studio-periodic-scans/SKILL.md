---
name: content-studio-periodic-scans
description: Continuous and periodic quality scan workflow for Content Studio. Use when running daily/weekly/release audits for correctness, performance, security, testing, and docs drift.
---

# Content Studio Periodic Scans

Use this skill to run recurring repo scans and produce a prioritized backlog.

## Scan Cadence

## Per PR (continuous)

- `pnpm typecheck`
- `pnpm test`
- `pnpm test:invariants` for backend changes
- `pnpm --filter web build` for frontend-impacting changes

## Daily

- Re-run failed suites from CI and triage root cause.
- Scan for docs/code drift in recently changed areas.
- Check top flaky tests and quarantine only with owner + follow-up issue.

## Weekly

- Cross-facet audit:
  - architecture boundary violations
  - authz gaps for mutating use cases
  - query key/invalidation safety
  - frontend loading/error-state regressions
  - performance regressions in route-level bundles and hot paths
  - security/dependency hygiene drift
- Review agent-authored merges for repeat mistakes and guardrail gaps.

## Monthly or Release Train

- Full project spirit audit and standards refresh.
- Review telemetry and incident data for missed classes of bugs.
- Reprioritize quality backlog and update skill/docs guardrails.

## Required Output

Produce findings in this order:

1. Critical risks
2. High-impact quick wins
3. Medium/low improvements
4. Proposed guardrail changes (tests, lint, docs, skills)

For every finding include:

- severity
- impact
- effort
- confidence
- file evidence

## Guardrail Rule

If the same failure pattern appears in 2+ merges, convert it into at least one:

- invariant test
- lint rule
- explicit docs rule
- skill checklist update

## Memory + Compounding

After each scan cycle, record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "Periodic Scans"` (prefer `node scripts/workflow-memory/add-entry.mjs`):

- repeated failure pattern
- guardrail chosen
- owner and due date
- verification status
