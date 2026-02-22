---
name: pr-risk-review
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

## Review Flow

1. Map changed files to the five review priorities.
2. Walk `Must-Check Risks` against those files.
3. Validate with targeted tests first, then repo-level gates if needed.
4. Emit findings-first output with exact file/line evidence.

## Must-Check Risks

- auth before mutating existing resources:
  - `packages/media/src/*/use-cases/`
- sanitize user-editable structured fields:
  - prompt/config inputs in `packages/media/src/*/use-cases/` and `packages/media/src/*/prompts.ts`
- query key invalidation safety (no hardcoded keys):
  - `apps/web/src/features/*/hooks/`
- explicit streaming state + typed stream contracts:
  - `apps/web/src/features/*/hooks/use-*-chat.ts`
  - `packages/api/src/contracts/chat.ts`
- unsafe casts at production boundaries:
  - changed files (`as never`, `as unknown as`)
- retry semantics for expected-not-found paths:
  - `apps/web/src/clients/queryClient.ts`
- telemetry lifecycle for server/worker startup and shutdown:
  - `apps/server/src/server.ts`
  - `apps/worker/src/worker.ts`

## Evidence Expectations

- changed files and risk mapping
- targeted test results
- repo-level checks when required (`pnpm typecheck`, `pnpm test`, `pnpm test:invariants`, `pnpm --filter web build`)
- for each finding, exact file path + line pointer

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

Record one event with workflow key `PR Risk Review` using `node agentic-harness-framework/scripts/workflow-memory/add-entry.mjs` per [`docs/workflow-memory/README.md`](../../../docs/workflow-memory/README.md). Include the event `id` in output.
