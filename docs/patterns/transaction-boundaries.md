# Transaction Boundaries Pattern

## Goal

Define when backend flows must use a database transaction, when compensating actions are acceptable, and how to keep side effects safe.

## Golden Principles

1. Keep ACID transactions for database state that must commit atomically.
<!-- enforced-by: manual-review -->

2. Never hold a DB transaction open while waiting on external network calls.
<!-- enforced-by: manual-review -->

3. For state-change + enqueue flows, use the shared transactional primitive.
<!-- enforced-by: invariant-test -->

4. When atomicity is impossible across systems, define compensating actions explicitly.
<!-- enforced-by: manual-review -->

## Decision Table

| Scenario | Pattern |
|---|---|
| DB state update + queue enqueue must be atomic | `withTransactionalStateAndEnqueue(...)` |
| Pure DB multi-write invariants | single DB transaction |
| DB write + external API/storage side effect | commit DB state, then external call + compensation on failure |
| External side effect first (content replacement) | upload first, persist pointer, cleanup old/new on failure |

## Required Patterns

### 1. State + Enqueue

Use the safety primitive:

```typescript
yield* withTransactionalStateAndEnqueue(
  repo.updateStatus(id, 'generating'),
  repo.updateStatus(id, 'draft'),
);
```

### 2. Non-Transactional Environments

`Db.singleConnection` environments (for example some test setups) can deadlock with nested transaction patterns; fallback to compensating mode is allowed via shared primitives.

### 3. External Side Effects

For storage/provider side effects:

1. Bound the call with timeout.
2. Persist enough state for replay/retry.
3. Add best-effort cleanup for partial failure paths.

## Anti-Patterns

Do not:

1. Mix direct `queue.enqueue(...)` with manual status updates in use cases.
2. Perform long external calls inside DB transaction blocks.
3. Swallow enqueue failures after state changes without compensation.

## Testing Requirements

1. Use-case tests for failure path rollback/compensation.
2. Workflow tests for status transitions across API and worker.
3. Invariant tests for mandatory safety primitive usage.

See [`docs/testing/job-workflow-tests.md`](../testing/job-workflow-tests.md) and [`docs/testing/invariants.md`](../testing/invariants.md).

## Related Standards

- [`docs/patterns/safety-primitives.md`](./safety-primitives.md)
- [`docs/patterns/job-queue.md`](./job-queue.md)
- [`docs/patterns/repository.md`](./repository.md)
