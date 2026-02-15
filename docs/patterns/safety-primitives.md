# Safety Primitives Pattern

This document defines the mandatory primitives for high-risk backend flows.

## Goal

Prevent regressions in:
- Ownership leaks
- Data loss during content replacement
- Partial state updates when enqueue fails

Use these primitives from `packages/media/src/shared/safety-primitives.ts`.

## Required Primitives

### 1. Job ownership checks <!-- enforced-by: invariant-test -->

Use `getOwnedJobOrNotFound(jobId)` for any job polling endpoint.

- Owner and admin can read the job.
- Non-owner gets `JobNotFoundError` (no existence leak).

### 2. Queue enqueue calls <!-- enforced-by: eslint, invariant-test -->

Use `enqueueJob({ type, payload, userId })` from use-cases.

- Do not call `queue.enqueue(...)` directly in use-cases.
- For state-change + enqueue flows, use `withTransactionalStateAndEnqueue(...)`.

### 3. Transactional state + enqueue <!-- enforced-by: invariant-test -->

Use `withTransactionalStateAndEnqueue(effect, compensate)` when state is updated immediately before enqueue.

- On real DB connections, the state writes + enqueue run in one transaction.
- In mock/non-transactional test setups, it falls back to `withCompensatingAction(...)`.

### 4. Compensating actions <!-- enforced-by: invariant-test -->

Use `withCompensatingAction(effect, compensate)` when you need best-effort rollback outside transactional flows.

### 5. Content replacement safety <!-- enforced-by: invariant-test -->

Use `replaceTextContentSafely(...)` for text content replacement.

Order of operations:
1. Upload new content
2. Persist new pointer/word count
3. Best-effort delete old content
4. On DB failure, delete the new upload

## Forbidden Raw Patterns <!-- enforced-by: eslint, invariant-test -->

In media use-cases:
- `queue.getJob(...)` is forbidden
- `queue.enqueue(...)` is forbidden

These are enforced by:
- `packages/media/eslint.config.js`
- `packages/media/src/shared/__tests__/safety-invariants.test.ts`
