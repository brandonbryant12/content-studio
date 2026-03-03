# Use Case Unit Tests

## Golden Principles

1. Every use case has a corresponding test file.
<!-- enforced-by: invariant-test -->

2. Assert error `_tag`, never error message strings.
<!-- enforced-by: manual-review -->

3. Test isolation: `beforeEach(() => resetAllFactories())` with mock repo layers.
<!-- enforced-by: manual-review -->

4. Use `Effect.runPromiseExit` + `_tag` assertions for typed errors.
<!-- enforced-by: manual-review -->

4a. In use-case tests, do not use `toBeInstanceOf(...)` for Effect failures; assert `_tag` + fields instead.
<!-- enforced-by: eslint -->

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
import { describe, it, expect, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { createTestUser, createTestDocument, withTestUser, resetAllFactories } from '@repo/testing';
import { MockDbLive } from '@repo/media/test-utils';
import { DocumentRepo } from '../../repos/document-repo';
import { getDocument } from '../get-document';

// Inline mock repo — override only the methods under test
const createMockDocumentRepo = (
  overrides: Partial<DocumentRepoService> = {},
) =>
  Layer.succeed(DocumentRepo, {
    findByIdForUser: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    insert: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    ...overrides,
  });

describe('getDocument', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns document when user owns it', async () => {
    const user = createTestUser({ id: 'user-1' });
    const document = createTestDocument({ createdBy: user.id });
    const mockRepo = createMockDocumentRepo({
      findByIdForUser: () => Effect.succeed(document),
    });
    const layers = Layer.mergeAll(MockDbLive, mockRepo);

    const result = await Effect.runPromise(
      withTestUser(user)(getDocument({ id: document.id })).pipe(
        Effect.provide(layers),
      ),
    );
    expect(result.id).toBe(document.id);
  });

  it('fails with DocumentNotFound for missing document', async () => {
    const user = createTestUser({ id: 'user-1' });
    const mockRepo = createMockDocumentRepo({
      findByIdForUser: () => Effect.fail(new DocumentNotFound({ id: 'missing' })),
    });
    const layers = Layer.mergeAll(MockDbLive, mockRepo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(getDocument({ id: 'missing' })).pipe(
        Effect.provide(layers),
      ),
    );
    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('DocumentNotFound');
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

## Anti-Bloat Rules
<!-- enforced-by: manual-review -->

1. Target one canonical success path per behavior branch; avoid near-identical input variants that prove the same branch.
2. Keep one representative authorization denial per use case unless multiple role branches exist.
3. Do not duplicate workflow-level state-transition checks here when covered in workflow tests.
4. Prefer shared mock repo factories from `packages/media/src/test-utils/` over inline full-service stubs.
5. Use `it.each` for validation matrices (IDs, statuses, boundary variants) instead of copy-pasted test blocks.
6. Avoid testing internal implementation details when return shape, side effects, and typed errors already prove behavior.
7. Avoid tests that only prove static typing contracts from Effect/TypeScript; keep unit tests focused on runtime branching, side effects, and tagged failures.

## Test Utilities

### Mock Repo Factories

Use shared factories from `packages/media/src/test-utils/` to avoid manually stubbing every method:

```typescript
import { createMockPodcastRepo, createMockDocumentRepo, MockDbLive } from '@repo/media/test-utils';

const mockRepo = createMockPodcastRepo({
  findByIdForUser: () => Effect.succeed(testPodcast),
});
const layers = Layer.mergeAll(MockDbLive, mockRepo);
```

Available: `createMockPodcastRepo`, `createMockVoiceoverRepo`, `createMockDocumentRepo`, `createMockActivityLogRepo`, `createMockInfographicRepo`, `createMockStylePresetRepo`, `MockDbLive`.

### withTestUser

Sets the current user on the FiberRef for the duration of the effect.

```typescript
import { withTestUser, createTestUser } from '@repo/testing';

const user = createTestUser({ id: 'user-1' });
const result = await Effect.runPromise(
  withTestUser(user)(effect).pipe(Effect.provide(layers))
);
```

### Test Data Factories

Use `createTestUser`, `createTestDocument`, etc. from `@repo/testing` for in-memory test fixtures:

```typescript
import { createTestUser, createTestDocument, resetAllFactories } from '@repo/testing';

beforeEach(() => resetAllFactories());

const user = createTestUser({ id: 'user-1' });
const doc = createTestDocument({ createdBy: user.id, title: 'Test Doc' });
```

### Integration Test Context (packages/api only)

For integration tests that need a real database, use `createTestContext` from `@repo/testing`. This starts/uses the shared PostgreSQL Testcontainer and creates a transaction-scoped context:

```typescript
import { createTestContext } from '@repo/testing';

let ctx: Awaited<ReturnType<typeof createTestContext>>;
beforeEach(async () => { ctx = await createTestContext(); });
afterEach(async () => { await ctx.rollback(); });
```

> **Note:** `createTestContext` is for integration tests in `packages/api/src/server/router/__tests__/` only. Unit tests in `packages/media/` use `MockDbLive` + mock repo layers instead.

## @effect/vitest (packages/ai)

Tests in `packages/ai/` use `@effect/vitest` for ergonomic Effect test runners:

```typescript
import { it } from '@effect/vitest';
import { describe, expect } from 'vitest';

describe('previewVoice', () => {
  it.layer(createMockTTSLayer())('successful preview', (it) => {
    it.effect('generates audio preview', () =>
      Effect.gen(function* () {
        const result = yield* previewVoice({ voiceId: 'Charon' });
        expect(result.voiceId).toBe('Charon');
      })
    );
  });
});
```

- `it.effect('name', () => Effect.gen(...))` — runs Effect automatically, no `await Effect.runPromise()`
- `it.layer(myLayer)('group', (it) => { ... })` — auto-provides layer to all tests in block

## Decision Table: Error Assertion Style
<!-- enforced-by: manual-review -->

| Scenario | Use |
|---|---|
| Verify error type only | `Effect.runPromiseExit` + `result.cause._tag === 'Fail'` + `error._tag` |
| Verify error type + properties | `Effect.runPromiseExit` + destructure error value + assert fields |
| Add runtime class guard (non-use-case tests only) | Optional outside use-case tests; use `_tag` + fields inside use-case tests |
| Quick check in test prototyping | `rejects.toThrow('TagName')` (upgrade before merge) |
