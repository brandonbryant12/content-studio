# Use Case Unit Tests

## Golden Principles

1. Every exported use case should have a corresponding test file. <!-- enforced-by: invariant-test -->
2. Assert error `_tag` and fields, not message strings. <!-- enforced-by: manual-review -->
3. Reset factory state in `beforeEach(() => resetAllFactories())`. <!-- enforced-by: manual-review -->
4. Use `Effect.runPromiseExit` for failure assertions. <!-- enforced-by: manual-review -->
5. Do not use `toBeInstanceOf(...)` for Effect failures in use-case tests. <!-- enforced-by: eslint -->
6. Run `pnpm test:invariants` alongside backend changes. <!-- enforced-by: invariant-test -->

## File Location

```
packages/media/src/{domain}/use-cases/__tests__/{action}.test.ts
packages/ai/src/**/__tests__/{action}.test.ts
```

## Canonical Example

See: `packages/media/src/source/use-cases/__tests__/get-source.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import {
  createTestUser,
  createTestSource,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import {
  createMockSourceRepo,
  MockDbLive,
} from '@repo/media/test-utils';
import { SourceNotFound } from '../../../errors';
import { getSource } from '../get-source';

describe('getSource', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns source when user owns it', async () => {
    const user = createTestUser({ id: 'user-1' });
    const source = createTestSource({ createdBy: user.id, title: 'My Source' });
    const layers = Layer.mergeAll(
      MockDbLive,
      createMockSourceRepo({
        findByIdForUser: () => Effect.succeed(source),
      }),
    );

    const result = await Effect.runPromise(
      withTestUser(user)(
        getSource({ id: source.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result.id).toBe(source.id);
    expect(result.title).toBe('My Source');
  });

  it('fails with SourceNotFound for missing source', async () => {
    const user = createTestUser({ id: 'user-1' });
    const layers = Layer.mergeAll(
      MockDbLive,
      createMockSourceRepo({
        findByIdForUser: (id) => Effect.fail(new SourceNotFound({ id })),
      }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        getSource({ id: 'missing' }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure' && result.cause._tag === 'Fail') {
      expect(result.cause.error._tag).toBe('SourceNotFound');
      expect(result.cause.error.id).toBe('missing');
    }
  });
});
```

## Coverage Requirements
<!-- enforced-by: manual-review -->

| Category | Minimum tests | What to verify |
|---|---|---|
| Success cases | 1-3 | Return shape, important side effects |
| Error cases | 1 per error type in the union | `_tag` and fields |
| Edge cases | 1-3 | Empty data, pagination, boundary values |
| Authorization | 1-2 | Cross-user denial and ownership concealment |

## Anti-Bloat Rules
<!-- enforced-by: manual-review -->

1. Keep one representative success case per meaningful branch.
2. Keep one representative authorization denial unless multiple role branches differ materially.
3. Do not duplicate workflow-level transition checks here when workflow tests already cover them.
4. Prefer shared mock repo factories from `packages/media/src/test-utils/`.
5. Use `it.each` for validation matrices instead of copy-pasted test blocks.
6. Keep tests focused on runtime branching, side effects, and tagged failures.

## Test Utilities

### Mock Repo Factories

Prefer shared factories over inline full-service stubs:

```typescript
import {
  createMockPodcastRepo,
  createMockSourceRepo,
  MockDbLive,
} from '@repo/media/test-utils';

const layers = Layer.mergeAll(
  MockDbLive,
  createMockSourceRepo({
    findByIdForUser: () => Effect.succeed(testSource),
  }),
);
```

Representative migrated example:

- `packages/media/src/source/use-cases/__tests__/get-source.test.ts`

Exception policy:

- Use shared `createMock*Repo(overrides)` helpers for repo-backed use-case tests by default.
- Do not hand-roll repo service objects filled with `Effect.die('not implemented')` in use-case tests.
- A test-local helper is acceptable only when no shared factory exists yet or the test needs coordinated multi-method state that the shared helper cannot model. In that case, implement only the exercised methods and keep the helper narrowly scoped to that file.

Available exports today:

- `createMockPodcastRepo`
- `createMockVoiceoverRepo`
- `createMockSourceRepo`
- `createMockActivityLogRepo`
- `createMockInfographicRepo`
- `createMockStylePresetRepo`
- `MockDbLive`

### `withTestUser`

Use `withTestUser(user)(effect)` to set the current user FiberRef for the duration of the test effect.

```typescript
const user = createTestUser({ id: 'user-1' });
await Effect.runPromise(
  withTestUser(user)(effect).pipe(Effect.provide(layers)),
);
```

### Test Data Factories

Use the in-memory factories from `@repo/testing`:

```typescript
import {
  createTestUser,
  createTestSource,
  resetAllFactories,
} from '@repo/testing';

beforeEach(() => resetAllFactories());

const user = createTestUser({ id: 'user-1' });
const source = createTestSource({ createdBy: user.id, title: 'Test Source' });
```

## Integration Test Context (packages/api only)

For router integration tests that need a real database, use `createTestContext()` from `@repo/testing`.

```typescript
let ctx: Awaited<ReturnType<typeof createTestContext>>;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx.rollback();
});
```

Unit tests in `packages/media/` should stay on `MockDbLive` plus mock repos unless the test truly needs runtime integration.

## `@effect/vitest` (packages/ai)

`packages/ai` tests may use `@effect/vitest` for Effect-native ergonomics:

```typescript
import { it } from '@effect/vitest';
import { describe, expect } from 'vitest';

describe('previewVoice', () => {
  it.layer(createMockTTSLayer())('successful preview', (it) => {
    it.effect('generates audio preview', () =>
      Effect.gen(function* () {
        const result = yield* previewVoice({ voiceId: 'Charon' });
        expect(result.voiceId).toBe('Charon');
      }),
    );
  });
});
```

## Error Assertion Decision Table
<!-- enforced-by: manual-review -->

| Scenario | Use |
|---|---|
| Verify error type only | `Effect.runPromiseExit` + `_tag` assertion |
| Verify error type and properties | `Effect.runPromiseExit` + assert fields on the fail value |
| Runtime class guard for non-domain errors | Optional outside use-case tests |
| Quick throw-based prototype | Acceptable temporarily, upgrade before merge |
