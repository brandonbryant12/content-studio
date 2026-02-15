# Invariant Tests

Invariant tests enforce non-negotiable architecture rules that should not regress.

## Command

Run:

```bash
pnpm test:invariants
```

This command is required for agent-authored backend changes.

## Current Invariants

### Media safety invariants

`packages/media/src/shared/__tests__/safety-invariants.test.ts`

Enforces:
- No direct `queue.getJob(...)` in use-cases
- No direct `queue.enqueue(...)` in use-cases
- `get-job` use-cases must use `getOwnedJobOrNotFound(...)`
- `update-document` must use `replaceTextContentSafely(...)`
- state-change + enqueue use-cases must use `withTransactionalStateAndEnqueue(...)`

### API error mapping invariants

`packages/api/src/server/__tests__/effect-handler.invariants.test.ts`

Enforces fallback mappings in `handleTaggedError(...)` for statuses that commonly drift:
- `409 -> CONFLICT`
- `502 -> SERVICE_UNAVAILABLE` preference
- `422 -> UNPROCESSABLE_CONTENT` preference

## When to Update Invariants

Update invariant tests when:
- introducing a new safety primitive
- banning a new raw pattern
- changing error mapping behavior intentionally

Do not remove invariant assertions without replacing them with equivalent protection.
