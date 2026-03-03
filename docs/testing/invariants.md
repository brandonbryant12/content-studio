# Invariant Tests

Invariant tests enforce non-negotiable architecture rules that must not regress.
<!-- enforced-by: invariant-test -->

## Command

```bash
pnpm test:invariants
```

Required for all agent-authored backend changes.

## Current Invariants

### Media Safety Invariants
<!-- enforced-by: invariant-test -->

**File:** `packages/media/src/shared/__tests__/safety-invariants.test.ts`

| Rule | What It Prevents |
|---|---|
| No blanket `Effect.catchAll(() => Effect.void/null)` in media use-cases | Silent production failures masked as success |
| No direct `queue.getJob(...)` in use cases | Bypassing ownership checks |
| No direct `queue.enqueue(...)` in use cases | Bypassing transactional state+enqueue |
| `get-job` use cases must use `getOwnedJobOrNotFound(...)` | Unauthorized job access |
| `update-document` must use `replaceTextContentSafely(...)` | Unsafe text content mutation |
| State-change + enqueue use cases must use `withTransactionalStateAndEnqueue(...)` | Non-atomic state transitions |

### API Chat Handler Invariants
<!-- enforced-by: invariant-test -->

**File:** `packages/api/src/server/__tests__/chat-handler.invariants.test.ts`

| Rule | What It Prevents |
|---|---|
| Chat handlers use protocol + span helpers | Missing telemetry spans or protocol shaping |
| Chat routes avoid direct `runtime.runPromise` | Bypassing shared handler pipeline |
| Chat handlers define `api.chat.*` spans | Missing or inconsistent tracing |

### Error Assertion Invariants
<!-- enforced-by: invariant-test -->

**File:** `packages/api/src/server/__tests__/error-assertions.invariants.test.ts`

| Rule | What It Prevents |
|---|---|
| `toBeInstanceOf(...)` is forbidden for tagged/backend errors (except allowlisted built-ins) | Incorrect error assertions masking regressions |

### API Error Mapping Invariants
<!-- enforced-by: invariant-test -->

**File:** `packages/api/src/server/__tests__/effect-handler.invariants.test.ts`

| Status Code | Required Mapping |
|---|---|
| `409` | `CONFLICT` |
| `502` | `SERVICE_UNAVAILABLE` |
| `422` | `UNPROCESSABLE_CONTENT` |

### Contract Schema Matrix Invariants
<!-- enforced-by: invariant-test -->

**File:** `packages/api/src/server/__tests__/contract-schema.invariants.test.ts`

| Rule | What It Prevents |
|---|---|
| `schema-validation` remains matrix-driven (`idSchemaCases` / `contractCases`) | Per-route UUID/brand assertion duplication and test bloat regrowth |
| Caps `it(...)` count and forbids per-route `describe('documents.*')` style blocks | Re-expansion to one test block per endpoint for equivalent boundary checks |

### Router Integration Bloat Invariants
<!-- enforced-by: invariant-test -->

**File:** `packages/api/src/server/__tests__/router-integration-bloat.invariants.test.ts`

| Rule | What It Prevents |
|---|---|
| Requires one shared unauthorized test per high-risk router suite (`document`, `podcast`, `voiceover`) | Reintroduction of repeated per-handler unauthorized tests |
| Forbids `returns UNAUTHORIZED when user is null` pattern in those suites | Legacy copy-paste auth duplication across handlers |
| Caps `it(...)` count per high-risk router suite with headroom | Unbounded integration test growth and verbose redundancy |

### Invariant Docs Sync
<!-- enforced-by: invariant-test -->

**File:** `packages/testing/src/__tests__/docs-invariants.test.ts`

| Rule | What It Prevents |
|---|---|
| All `pnpm test:invariants` files must appear in this doc | Invariant-doc drift and missing documentation |

## When to Update Invariants
<!-- enforced-by: manual-review -->

Update invariant tests when:
- Introducing a new safety primitive
- Banning a new raw pattern
- Changing error mapping behavior intentionally

Do not remove invariant assertions without replacing them with equivalent protection.
