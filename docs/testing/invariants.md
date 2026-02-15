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
| No direct `queue.getJob(...)` in use cases | Bypassing ownership checks |
| No direct `queue.enqueue(...)` in use cases | Bypassing transactional state+enqueue |
| `get-job` use cases must use `getOwnedJobOrNotFound(...)` | Unauthorized job access |
| `update-document` must use `replaceTextContentSafely(...)` | Unsafe text content mutation |
| State-change + enqueue use cases must use `withTransactionalStateAndEnqueue(...)` | Non-atomic state transitions |

### API Error Mapping Invariants
<!-- enforced-by: invariant-test -->

**File:** `packages/api/src/server/__tests__/effect-handler.invariants.test.ts`

| Status Code | Required Mapping |
|---|---|
| `409` | `CONFLICT` |
| `502` | `SERVICE_UNAVAILABLE` |
| `422` | `UNPROCESSABLE_CONTENT` |

## When to Update Invariants
<!-- enforced-by: manual-review -->

Update invariant tests when:
- Introducing a new safety primitive
- Banning a new raw pattern
- Changing error mapping behavior intentionally

Do not remove invariant assertions without replacing them with equivalent protection.
