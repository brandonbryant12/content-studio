---
name: content-studio-test-surface-steward
description: Test strategy stewardship workflow for balancing use-case, integration, workflow, invariant, frontend, and e2e coverage.
---

# Content Studio Test Surface Steward

Use this skill when adding/refactoring behavior or when test health drifts.

## Standards To Anchor

- `docs/testing/overview.md`
- `docs/testing/use-case-tests.md`
- `docs/testing/integration-tests.md`
- `docs/testing/job-workflow-tests.md`
- `docs/testing/invariants.md`
- `docs/testing/live-tests.md`
- `docs/frontend/testing.md`

## Stewardship Flow

1. Classify changed behavior by surface (domain/API/worker/frontend).
2. Map required test types from `docs/testing/overview.md`.
3. Verify test depth is appropriate:
   - no missing required layer
   - no redundant tests for compile-time guarantees
4. Evaluate reliability:
   - flaky tests
   - long-running hotspots
   - fragile setup patterns
5. Propose smallest set of additions/removals to restore healthy coverage.

## Output Contract

1. Missing tests (required)
2. Weak tests (should improve)
3. Redundant tests (can remove)
4. Flake and runtime risks
5. Recommended validation command set

Include file evidence and expected confidence gain for each recommendation.

## Memory + Compounding

Record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "Test Surface Steward"` (prefer `node scripts/workflow-memory/add-entry.mjs`):

- escaped defect class
- missing/weak test layer that allowed it
- test guardrail added and verification result
