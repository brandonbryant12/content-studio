# Use Case Unit Tests

## Golden Principles

1. Every use case has a corresponding test file.
<!-- enforced-by: invariant-test -->

2. Assert error `_tag`, never error message strings.
<!-- enforced-by: manual-review -->

3. Test isolation: `beforeEach(createTestContext)`, `afterEach(cleanup)`.
<!-- enforced-by: manual-review -->

4. Use `Effect.runPromiseExit` + `_tag` assertions for typed errors.
<!-- enforced-by: manual-review -->

5. Run `pnpm test:invariants` alongside use case tests for backend changes.
<!-- enforced-by: invariant-test -->

## File Location

```
packages/media/src/{domain}/use-cases/__tests__/{action}.test.ts
packages/ai/src/{domain}/use-cases/__tests__/{action}.test.ts
```

## Canonical Example

See: `packages/media/src/document/use-cases/__tests__/get-document.test.ts`

## Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Effect, Exit, Cause, Option } from 'effect';
import { createTestContext, withTestUser, type TestContext } from '@repo/testing';

describe('useCaseName', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('succeeds with valid input', async () => {
    const result = await Effect.runPromise(
      withTestUser(user)(useCase(input)).pipe(Effect.provide(ctx.layers))
    );
    expect(result.id).toBe(expected);
  });

  it('fails with typed error', async () => {
    const exit = await Effect.runPromiseExit(
      withTestUser(user)(useCase(badInput)).pipe(Effect.provide(ctx.layers))
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.failureOption(exit.cause);
      expect(Option.isSome(error)).toBe(true);
      if (Option.isSome(error)) {
        expect(error.value._tag).toBe('DocumentNotFound');
      }
    }
  });
});
```

## Coverage Requirements
<!-- enforced-by: manual-review -->

| Category | Minimum Tests | What to Verify |
|---|---|---|
| Success cases | 1-3 | Return value shape, side effects |
| Error cases | 1 per error type in union | Error `_tag` matches |
| Edge cases | 1-3 | Empty results, pagination, boundary values |
| Authorization | 1-2 | User isolation, cross-user denial returns 404-equivalent |

## Test Utilities

### Test Context

Provides DB connection, layers, and cleanup. Always create fresh per test.

```typescript
import { createTestContext, type TestContext } from '@repo/testing';
```

### withTestUser

Sets the current user on the FiberRef for the duration of the effect.

```typescript
import { withTestUser } from '@repo/testing';

const result = await Effect.runPromise(
  withTestUser(user)(effect).pipe(Effect.provide(ctx.layers))
);
```

### Factories

Use factories from `@repo/testing` to create test data. Prefer `create` (persisted) over `build` (in-memory).

```typescript
import { UserFactory, DocumentFactory } from '@repo/testing';

const user = await UserFactory.create(ctx.db);
const doc = await DocumentFactory.create(ctx.db, { userId: user.id });
```

## Decision Table: Error Assertion Style
<!-- enforced-by: manual-review -->

| Scenario | Use |
|---|---|
| Verify error type only | `Effect.runPromiseExit` + `_tag` check |
| Verify error type + properties | `Effect.runPromiseExit` + destructure error value |
| Quick check in test prototyping | `rejects.toThrow('TagName')` (upgrade before merge) |
