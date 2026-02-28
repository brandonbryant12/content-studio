# Router Integration Tests

```mermaid
graph LR
  Test[Test Code] -->|direct call| Handler[oRPC Handler]
  Handler --> EH[handleEffectWithProtocol]
  EH --> UC[Use Case]
  UC --> MockRepo[Mock Repos via DB]
  UC --> MockAI[MockLLM / MockTTS]
  UC --> MockStorage[In-Memory Storage]
  MockRepo --> TestDB[(Test PostgreSQL :5433)]
```

## Golden Principles

1. Every handler has at least one integration test.
<!-- enforced-by: manual-review -->

2. Direct handler calls, not HTTP requests.
<!-- enforced-by: manual-review -->

3. Test error protocol compliance: status code + error code match the error class.
<!-- enforced-by: manual-review -->

4. Update the integration test runtime when adding new services.
<!-- enforced-by: manual-review -->

5. Use `ctx.cleanup()` consistently in `afterEach`.
<!-- enforced-by: manual-review -->

## File Location

```
packages/api/src/server/router/__tests__/{router}.integration.test.ts
```

## Canonical Example

See: `packages/api/src/server/router/__tests__/document.integration.test.ts`

## Prerequisites

### Option A — PGlite (no Docker required)

```bash
pnpm --filter @repo/api test   # Just works — no setup needed
```

Replace `createTestContext()` with `createPGliteTestContext()` from `@repo/testing` in your test file. PGlite runs PostgreSQL in-process via WASM — no Docker, no containers, no port conflicts. The first call pushes the Drizzle schema and snapshots the datadir (~1s); subsequent calls restore from the snapshot (~200ms).

### Option B — Docker PostgreSQL (existing approach)

```bash
pnpm test:db:up       # Start test PostgreSQL on :5433
pnpm test:db:setup    # Push schema
pnpm --filter @repo/api test
```

## Test Dependencies

| Dependency | Source | Purpose |
|---|---|---|
| Test Database (PGlite) | `@electric-sql/pglite` | In-process WASM PostgreSQL (no Docker) |
| Test Database (Docker) | Docker (`pnpm test:db:up`) | PostgreSQL on port 5433 (fallback) |
| `createTestContext` | `@repo/testing` | DB connection + transaction (Docker) |
| `createPGliteTestContext` | `@repo/testing` | DB connection + snapshot isolation (PGlite) |
| `createTestUser` / `toUser` | `@repo/testing` | Test user factory |
| `createInMemoryStorage` | `@repo/storage/testing` | In-memory S3-compatible storage |
| `MockLLMLive` / `MockTTSLive` | `@repo/ai/testing` | Mock AI service layers |
| `createMockContext` | `./helpers` | Mock oRPC context with runtime + user |
| `createMockErrors` | `./helpers` | Mock oRPC error factories |

**Test helpers:** `packages/api/src/server/router/__tests__/helpers.ts`

## Test Structure

```typescript
describe('{domain} router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let user: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);
    const testUser = createTestUser();
    user = toUser(testUser);
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('{domain}.get', () => {
    it('returns serialized entity when found', async () => {
      const context = createMockContext(runtime, user);
      const result = await router.get['~orpc'].handler({ context, input, errors });
      expect(typeof result.createdAt).toBe('string'); // Dates serialized
    });

    it('throws NOT_FOUND when missing', async () => {
      const context = createMockContext(runtime, user);
      await expect(
        router.get['~orpc'].handler({ context, input: { id: 'nonexistent' }, errors })
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});
```

## Runtime Setup

Build a minimal `ManagedRuntime` with mock AI and in-memory storage. Include only the layers the router under test requires.

```typescript
const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  const inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(MockLLMLive, MockTTSLive, inMemoryStorage.layer);
  const repoLayer = EntityRepoLive.pipe(Layer.provide(ctx.dbLayer));

  return ManagedRuntime.make(
    Layer.mergeAll(ctx.dbLayer, mockAILayers, repoLayer)
  );
};
```

## Coverage Requirements
<!-- enforced-by: manual-review -->

| Category | Per Handler | What to Verify |
|---|---|---|
| Success | 1 | Correct serialized response shape |
| Authentication | 1 (shared per router) | `null` user throws UNAUTHORIZED |
| Authorization | 1-2 | Cross-user access returns NOT_FOUND |
| Error cases | 1 per error type | Error code matches protocol |
| Response format | 1 (shared per router) | Dates are strings, IDs match patterns |

## Why Test All Handlers

Missing service dependencies only fail at **runtime**, not compile time. A handler requiring `CollaboratorRepo` compiles even if `CollaboratorRepo` is missing from the production layer. Integration tests catch this by actually executing the handler through the Effect runtime.
<!-- enforced-by: manual-review -->

## Adding New Services
<!-- enforced-by: manual-review -->

When a new Effect service is added to the production runtime:

1. Add it to the bundled layer (see [`docs/patterns/effect-runtime.md`](../patterns/effect-runtime.md))
2. Add the corresponding layer to `createTestRuntime` in **all affected** integration test files
3. Run `pnpm --filter @repo/api test` to verify

## Test Organization

```
describe('{Domain} Router Integration', () => {
  // Setup: ctx, runtime, user, errors
  // beforeEach / afterEach

  describe('{domain}.list', () => { ... });
  describe('{domain}.get', () => { ... });
  describe('{domain}.create', () => { ... });
  describe('{domain}.update', () => { ... });
  describe('{domain}.delete', () => { ... });
});
```

## Existing Integration Test Files

| File | Domain |
|---|---|
| `packages/api/src/server/router/__tests__/document.integration.test.ts` | Documents |
| `packages/api/src/server/router/__tests__/podcast.integration.test.ts` | Podcasts |
| `packages/api/src/server/router/__tests__/voiceover.integration.test.ts` | Voiceovers |
| `packages/api/src/server/router/__tests__/voices.integration.test.ts` | Voices |

## PGlite Integration

[PGlite](https://pglite.dev/) is a WASM build of PostgreSQL that runs in-process with Node.js. It eliminates the Docker dependency for integration tests.

### Switching a test to PGlite

Replace the import:

```diff
-import { createTestContext } from '@repo/testing';
+import { createPGliteTestContext } from '@repo/testing';
```

And the setup call:

```diff
 beforeEach(async () => {
-  ctx = await createTestContext();
+  ctx = await createPGliteTestContext();
   runtime = createTestRuntime(ctx);
 });
```

Everything else stays the same — `ctx.db`, `ctx.dbLayer`, and `ctx.rollback()` work identically.

### How it works

1. First call: creates an in-memory PGlite instance, pushes the Drizzle schema via `drizzle-kit/api`, and snapshots the datadir
2. Subsequent calls: restore from the cached snapshot (~200ms)
3. `rollback()` closes the PGlite instance, discarding all changes

### Performance comparison

| Approach | Per-test setup | Docker required |
|----------|----------------|-----------------|
| Docker + `createTestContext` rollback | ~50ms (after initial ~5s) | Yes |
| PGlite + snapshot restore | ~200ms (after initial ~1s) | No |

### Compatibility

- PGlite ships PostgreSQL 16.x, matching the project's `postgres:16-alpine` Docker image
- JSONB, foreign keys, enums, indexes, `FOR UPDATE SKIP LOCKED` all work
- `drizzle-orm/pglite` driver is officially supported
