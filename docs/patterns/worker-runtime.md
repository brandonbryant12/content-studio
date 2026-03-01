# Worker Runtime Pattern

## Goal

Define stable runtime, fiber, concurrency, and shutdown patterns for background workers using Effect.

## Golden Principles

1. Worker process uses one shared `ManagedRuntime` per process.
<!-- enforced-by: architecture -->

2. Long-lived loops are forked with `Effect.forkDaemon` (not `Effect.fork`).
<!-- enforced-by: manual-review -->

3. Job execution runs with explicit worker concurrency limits.
<!-- enforced-by: manual-review -->

4. Per-job user context is set with `withCurrentUser(makeJobUser(...))` before domain execution.
<!-- enforced-by: manual-review -->

5. Graceful shutdown drains active jobs before process exit.
<!-- enforced-by: manual-review -->

## Runtime Lifecycle

1. Build runtime at startup with `createServerRuntime(...)`.
2. Start polling loop in daemon fiber.
3. Process jobs in scoped child fibers.
4. On shutdown: stop polling, drain active jobs, dispose runtime, close DB pool.

## Polling + Retry

Use bounded retry schedules for poll-loop failures:

```typescript
Schedule.exponential(pollInterval, 2).pipe(
  Schedule.union(Schedule.spaced(backoffCapMs)),
  Schedule.intersect(Schedule.recurs(maxConsecutiveErrors - 1)),
);
```

Rules:

1. Retry loop-level transient failures.
2. Mark job-level failures on the job itself, do not crash the worker.
3. Surface terminal loop failure with explicit error logging.

## Concurrency Control

1. Maintain `activeJobs` counter (or equivalent).
2. Skip new claims when at capacity.
3. Fork each claimed job in a scoped fiber and decrement on completion/failure.

## Job Context and Auth

Workers execute domain use cases with synthetic user context derived from job ownership.

```typescript
const run = withCurrentUser(makeJobUser(userId));
```

This preserves use-case auth invariants (`getCurrentUser`) without coupling use cases to worker internals.

## Shutdown Semantics

Graceful shutdown order:

1. Stop receiving new work.
2. Wait for active jobs to drain (bounded timeout).
3. Dispose runtime (`runtime.dispose()`).
4. Close DB/SSE resources.

If drain timeout is exceeded, log and force exit.

## Observability Requirements

1. Worker spans follow `worker.{domain}.{action}` naming.
2. Include `job.id`, `job.type`, and `user.id` attributes where available.
3. Log failure cause + stack for defects.

See [`docs/architecture/observability.md`](../architecture/observability.md).

## Related Standards

- [`docs/patterns/effect-runtime.md`](./effect-runtime.md)
- [`docs/patterns/job-queue.md`](./job-queue.md)
- [`docs/patterns/transaction-boundaries.md`](./transaction-boundaries.md)
