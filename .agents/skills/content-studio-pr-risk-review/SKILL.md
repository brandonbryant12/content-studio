---
name: content-studio-pr-risk-review
description: Pre-merge risk review focused on regression prevention, auth/data safety, and test coverage gaps.
---

# Content Studio PR Risk Review

Use this skill before merge for agent-authored or high-risk human-authored changes.

## Review Priority

1. correctness/regression risk
2. authorization/data safety risk
3. API/contract compatibility risk
4. missing or weak test evidence
5. docs/guardrail drift

## Must-Check Risks

- auth before mutating existing resources
- sanitize user-editable structured fields
- query key invalidation safety (no hardcoded keys)
- explicit streaming state handling and typed stream contracts
- unsafe casts at production boundaries
- retry semantics for expected-not-found paths
- telemetry lifecycle for server/worker startup and shutdown

## Evidence Expectations

- changed files and risk mapping
- targeted test results
- repo-level checks when required (`pnpm typecheck`, `pnpm test`, `pnpm test:invariants`, `pnpm --filter web build`)

## Output Contract

Findings-first output, ordered by severity:

1. Critical
2. High
3. Medium/Low
4. Residual risk + merge recommendation

For each finding include:

- impact
- confidence
- file evidence
- minimal fix path

## Memory + Compounding

Record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "PR Risk Review"` (prefer `node scripts/workflow-memory/add-entry.mjs`):

- top risk category this PR
- what check caught it (or missed it)
- new guardrail required if pattern repeats
