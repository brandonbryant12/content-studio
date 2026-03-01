# External Service Resilience Pattern

## Goal

Standardize how backend code calls external systems (LLM/TTS/image providers, storage APIs, remote fetchers) so failures are predictable, observable, and bounded.

## Golden Principles

1. Every external call has explicit timeout, retry, and typed error mapping behavior.
<!-- enforced-by: manual-review -->

2. Retries are bounded and only for transient failures.
<!-- enforced-by: manual-review -->

3. Idempotency is required for operations that may be retried or replayed.
<!-- enforced-by: manual-review -->

4. SDK/internal retry loops must not conflict with Effect retry policy.
<!-- enforced-by: manual-review -->

5. All provider calls emit spans with provider + operation attributes.
<!-- enforced-by: manual-review -->

## Required Call Shape

```typescript
Effect.tryPromise({
  try: async () => {
    // external SDK or HTTP call
  },
  catch: mapError,
}).pipe(
  retryTransientProvider,
  Effect.withSpan('provider.operation', {
    attributes: { 'provider.name': 'google' },
  }),
);
```

## Timeout Policy

1. HTTP calls must include cancellation/timeout (`AbortSignal.timeout(...)` or `Effect.timeoutFail(...)`).
2. Long-running provider calls should still have a bounded timeout budget.
3. Timeout failures must map to typed service errors (not raw thrown errors).

## Retry Policy

1. Use Effect retry (`Effect.retry` / shared retry helper), not hidden SDK retries.
2. Retry only transient error tags (`rate-limit`, `temporary provider`, `network transient`).
3. Keep retry counts small and bounded.
4. Do not retry validation/content-policy/authorization failures.

## Idempotency Policy

For operations that can be repeated (worker retries, duplicate submit, network replay):

1. Check for existing active work before enqueueing duplicate jobs.
2. Use deterministic keys where possible for external side effects.
3. Persist state transitions before/after calls in a way that allows safe replay.
4. Prefer compensating cleanup on partial failures.

See [`docs/patterns/transaction-boundaries.md`](./transaction-boundaries.md) and [`docs/patterns/job-queue.md`](./job-queue.md).

## Error Classification

Map provider failures into typed errors with explicit protocol metadata:

| Class | Retry | Status |
|---|---|---|
| Rate limit / transient upstream | Yes (bounded) | 502/503 |
| Provider timeout | Yes (bounded) | 503 |
| Invalid prompt/input | No | 400/422 |
| Content/policy rejection | No | 400/422 |
| Permanent auth/config failure | No | 500/503 |

See [`docs/patterns/error-handling.md`](./error-handling.md).

## Observability Requirements

All external calls should include:

1. Span name: `{service}.{operation}` (for example `llm.generate`, `tts.synthesize`, `storage.upload`).
2. Provider attributes (`provider`, `model`, `operation` where relevant).
3. Error `_tag` propagation on failure.

See [`docs/architecture/observability.md`](../architecture/observability.md).

## Test Requirements

1. Unit tests: transient vs non-transient retry behavior.
2. Integration tests: typed error mapping from provider failures.
3. Live tests: smoke coverage with real credentials (skip-by-default).

See [`docs/testing/live-tests.md`](../testing/live-tests.md).

## Related Standards

- [`docs/patterns/error-handling.md`](./error-handling.md)
- [`docs/patterns/effect-runtime.md`](./effect-runtime.md)
- [`docs/patterns/job-queue.md`](./job-queue.md)
