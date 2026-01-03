# Router Integration Tests

This document defines the standard pattern for testing API routers.

## Overview

Integration tests verify that handlers:
1. Call correct use cases
2. Serialize responses properly
3. Handle authentication/authorization
4. Return correct error responses

## Dependencies

Integration tests require:

| Dependency | Source | Purpose |
|------------|--------|---------|
| Test Database | Docker (`pnpm test:db:up`) | PostgreSQL on port 5433 |
| `createTestContext` | `@repo/testing` | DB connection + transaction |
| `createTestUser` | `@repo/testing` | Test user factory |
| `toUser` | `@repo/testing` | Convert DB user to User type |
| `resetAllFactories` | `@repo/testing` | Reset factory sequences |
| `createInMemoryStorage` | `@repo/testing/mocks` | In-memory S3-compatible storage |
| `MockLLMLive` | `@repo/testing/mocks` | Mock LLM service layer |
| `MockTTSLive` | `@repo/testing/mocks` | Mock TTS service layer |
| `createMockContext` | `./helpers` | Mock oRPC context |
| `createMockErrors` | `./helpers` | Mock error factories |

### Before Running Tests

```bash
# Start test database
pnpm test:db:up

# Push schema
pnpm test:db:setup

# Run tests
pnpm --filter @repo/api test
```

## File Location

```
packages/api/src/server/router/__tests__/{router}.integration.test.ts
```

## Test Approach

Use **direct handler calls** instead of HTTP requests:
- Faster execution (no HTTP overhead)
- Easier setup (no server needed)
- Same coverage (tests handler logic)

## Standard Test Template

```typescript
// packages/api/src/server/router/__tests__/document.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Layer, ManagedRuntime } from 'effect';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import {
  createInMemoryStorage,
  MockLLMLive,
  MockTTSLive,
} from '@repo/testing/mocks';
import { user as userTable } from '@repo/db/schema';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import { DocumentRepoLive } from '@repo/media';
import type { ServerRuntime } from '../../runtime';
import documentRouter from '../document';
import { createMockContext, createMockErrors } from './helpers';

// =============================================================================
// Test Runtime Setup
// =============================================================================

let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create a minimal test runtime with only the services needed.
 * Uses in-memory storage and mock AI services.
 */
const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(MockLLMLive, MockTTSLive, inMemoryStorage.layer);
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const documentRepoLayer = DocumentRepoLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    documentRepoLayer,
  );

  return ManagedRuntime.make(allLayers);
};

/**
 * Insert a test user into the database.
 * Required because documents have a foreign key to user.
 */
const insertTestUser = async (
  ctx: TestContext,
  testUser: ReturnType<typeof createTestUser>
) => {
  await ctx.db.insert(userTable).values({
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    emailVerified: true,
    role: testUser.role,
  });
};

// =============================================================================
// Tests
// =============================================================================

describe('document router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let testUser: ReturnType<typeof createTestUser>;
  let user: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);
    testUser = createTestUser();
    user = toUser(testUser);
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  describe('get handler', () => {
    it('returns serialized document when found', async () => {
      // Create document in DB first...
      const context = createMockContext(runtime, user);
      const input = { id: 'doc_123' };

      const result = await documentRouter.get['~orpc'].handler({
        context,
        input,
        errors,
      });

      expect(result.id).toBe('doc_123');
      expect(typeof result.createdAt).toBe('string'); // Serialized
    });

    it('throws DOCUMENT_NOT_FOUND when not found', async () => {
      const context = createMockContext(runtime, user);

      await expect(
        documentRouter.get['~orpc'].handler({
          context,
          input: { id: 'doc_nonexistent' },
          errors,
        })
      ).rejects.toThrow('DOCUMENT_NOT_FOUND');
    });

    it('throws UNAUTHORIZED when user is null', async () => {
      const context = createMockContext(runtime, null);

      await expect(
        documentRouter.get['~orpc'].handler({
          context,
          input: { id: 'doc_123' },
          errors,
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
```

## Test Helpers

Create shared helpers in `packages/api/src/server/router/__tests__/helpers.ts`:

```typescript
import { ORPCError } from '@orpc/client';
import type { User } from '@repo/auth/policy';
import type { ServerRuntime } from '../../runtime';
import type { ORPCContext, AuthenticatedORPCContext } from '../../orpc';

/**
 * Create a mock session from a User for testing.
 */
export const createMockSession = (user: User) => ({
  session: {
    id: `session_${user.id}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    token: `token_${user.id}`,
  },
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});

/**
 * Create a mock oRPC context for testing handlers.
 */
export function createMockContext(
  runtime: ServerRuntime,
  user: User,
): AuthenticatedORPCContext;
export function createMockContext(
  runtime: ServerRuntime,
  user: null,
): ORPCContext;
export function createMockContext(
  runtime: ServerRuntime,
  user: User | null,
): ORPCContext | AuthenticatedORPCContext {
  if (user === null) {
    return { session: null, user: null, runtime };
  }
  return {
    session: createMockSession(user),
    user,
    runtime,
  } as AuthenticatedORPCContext;
}

/**
 * Error codes used across the API.
 */
type ErrorCode =
  | 'DOCUMENT_NOT_FOUND'
  | 'DOCUMENT_TOO_LARGE'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  // ... add more as needed

const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  DOCUMENT_NOT_FOUND: 404,
  DOCUMENT_TOO_LARGE: 413,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

/**
 * Create mock error factories for testing.
 */
export const createMockErrors = () => {
  const createErrorFactory = (code: ErrorCode) =>
    (opts: { message: string; data?: unknown }) =>
      new ORPCError(code, {
        status: ERROR_STATUS_CODES[code],
        message: opts.message,
        data: opts.data,
      });

  return {
    DOCUMENT_NOT_FOUND: createErrorFactory('DOCUMENT_NOT_FOUND'),
    DOCUMENT_TOO_LARGE: createErrorFactory('DOCUMENT_TOO_LARGE'),
    UNAUTHORIZED: createErrorFactory('UNAUTHORIZED'),
    NOT_FOUND: createErrorFactory('NOT_FOUND'),
    INTERNAL_ERROR: createErrorFactory('INTERNAL_ERROR'),
    // ... add more as needed
  };
};
```

## Test Categories

### 1. Success Cases

Test handlers return correct serialized data.

```typescript
describe('success cases', () => {
  it('returns serialized document', async () => {
    const user = await UserFactory.create(ctx.db);
    const doc = await DocumentFactory.create(ctx.db, { userId: user.id });

    const result = await documentRouter.get.handler({
      context: createMockContext(runtime, toUser(user)),
      input: { id: doc.id },
      errors: createMockErrors(),
    });

    // Check serialization format
    expect(result.id).toBe(doc.id);
    expect(typeof result.createdAt).toBe('string');  // Date -> string
    expect(typeof result.updatedAt).toBe('string');
  });

  it('returns list with correct pagination', async () => {
    const user = await UserFactory.create(ctx.db);
    for (let i = 0; i < 10; i++) {
      await DocumentFactory.create(ctx.db, { userId: user.id });
    }

    const result = await documentRouter.list.handler({
      context: createMockContext(runtime, toUser(user)),
      input: { limit: 5, offset: 0 },
      errors: createMockErrors(),
    });

    expect(result).toHaveLength(5);
  });
});
```

### 2. Authentication

Test null user handling.

```typescript
describe('authentication', () => {
  it('throws UNAUTHORIZED when user is null', async () => {
    await expect(
      documentRouter.get.handler({
        context: createMockContext(runtime, null),
        input: { id: 'doc_123' },
        errors: createMockErrors(),
      })
    ).rejects.toThrow('UNAUTHORIZED');
  });
});
```

### 3. Authorization

Test user can only access their resources.

```typescript
describe('authorization', () => {
  it('throws NOT_FOUND when accessing other user\'s document', async () => {
    const user1 = await UserFactory.create(ctx.db);
    const user2 = await UserFactory.create(ctx.db);
    const doc = await DocumentFactory.create(ctx.db, { userId: user1.id });

    await expect(
      documentRouter.get.handler({
        context: createMockContext(runtime, toUser(user2)),
        input: { id: doc.id },
        errors: createMockErrors(),
      })
    ).rejects.toThrow('NOT_FOUND');
  });
});
```

### 4. Error Responses

Test error handling returns correct codes.

```typescript
describe('error responses', () => {
  it('returns NOT_FOUND for missing document', async () => {
    const user = await UserFactory.create(ctx.db);

    try {
      await documentRouter.get.handler({
        context: createMockContext(runtime, toUser(user)),
        input: { id: 'doc_nonexistent' },
        errors: createMockErrors(),
      });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  it('includes error data for structured errors', async () => {
    const user = await UserFactory.create(ctx.db);

    try {
      await documentRouter.upload.handler({
        context: createMockContext(runtime, toUser(user)),
        input: {
          file: new Blob(['x'.repeat(10_000_000)]),
          fileName: 'huge.txt',
        },
        errors: createMockErrors(),
      });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e.code).toBe('BAD_REQUEST');
      expect(e.data?.fileSize).toBeDefined();
    }
  });
});
```

### 5. Response Format

Verify serialization matches API contract.

```typescript
describe('response format', () => {
  it('document matches SerializedDocument schema', async () => {
    const user = await UserFactory.create(ctx.db);
    const doc = await DocumentFactory.create(ctx.db, { userId: user.id });

    const result = await documentRouter.get.handler({
      context: createMockContext(runtime, toUser(user)),
      input: { id: doc.id },
      errors: createMockErrors(),
    });

    // Verify shape matches contract
    expect(result).toMatchObject({
      id: expect.stringMatching(/^doc_/),
      title: expect.any(String),
      content: expect.any(String),
      wordCount: expect.any(Number),
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });
});
```

## Coverage Requirements

Every router test file should cover:

| Category | Tests Per Handler |
|----------|-------------------|
| Success case | 1 |
| Authentication | 1 (shared) |
| Authorization | 1-2 |
| Error cases | 1 per error type |
| Response format | 1 (shared) |

## Test Organization

```typescript
describe('Document Router Integration', () => {
  // Setup
  let ctx: TestContext;
  let runtime: ServerRuntime;

  beforeEach(async () => { ... });
  afterEach(async () => { ... });

  // Per-handler tests
  describe('documents.list', () => { ... });
  describe('documents.get', () => { ... });
  describe('documents.create', () => { ... });
  describe('documents.update', () => { ... });
  describe('documents.delete', () => { ... });
});
```

## Mock AI Services

Use `useMockAI: true` when creating runtime:

```typescript
runtime = createServerRuntime({
  db: ctx.db,
  geminiApiKey: 'test-key',
  storageConfig: { type: 'memory' },
  useMockAI: true,  // Mocks LLM and TTS
});
```

## Required: Test All Handlers

Every handler in a router MUST have at least one integration test that exercises the full Effect stack.

### Why This Matters

Missing service dependencies only fail at **runtime**, not compile time (unless using proper typing). A handler that requires `CollaboratorRepo` will compile even if `CollaboratorRepo` isn't in the production layer, but will fail when called.

Integration tests catch this by:
1. Creating a test runtime with all required services
2. Actually calling the handler (not mocking the use case)
3. Verifying the response or error

### Coverage Requirements

| Handler Type | Required Tests |
|--------------|----------------|
| CRUD (create, get, update, delete) | At least 1 success + 1 error each |
| Actions (generate, approve, etc.) | At least 1 success + 1 error each |
| List operations | At least 1 with data + 1 empty |
| Multi-user operations | At least 1 owner + 1 collaborator scenario |

### Multi-User Collaboration Tests

When a feature involves multiple users (ownership, collaboration, sharing), write tests that:

1. Create separate test users for each role (owner, collaborator, stranger)
2. Test that authorized users CAN perform the action
3. Test that unauthorized users CANNOT perform the action
4. Test edge cases like pending invites (userId is null)

```typescript
// Example: Testing collaborator access
it('allows collaborator with claimed invite to approve', async () => {
  // Create two users
  const ownerTestUser = createTestUser();
  const collaboratorTestUser = createTestUser();
  await insertTestUser(ctx, ownerTestUser);
  await insertTestUser(ctx, collaboratorTestUser);

  // Create podcast owned by owner
  const podcast = await insertTestPodcast(ctx, ownerTestUser.id, {...});

  // Add collaborator with userId set (claimed invite)
  await insertTestCollaborator(ctx, {
    podcastId: podcast.id,
    userId: collaboratorTestUser.id,  // Must be set for access
    email: collaboratorTestUser.email,
    addedBy: ownerTestUser.id,
  });

  // Test as collaborator
  const collaboratorUser = toUser(collaboratorTestUser);
  const context = createMockContext(runtime, collaboratorUser);
  const result = await handlers.approve({...});

  expect(result.isOwner).toBe(false);
});

it('rejects approval from user with pending invite', async () => {
  // userId: null means invite not claimed - should fail
  await insertTestCollaborator(ctx, {
    podcastId: podcast.id,
    userId: null,  // Pending invite
    email: pendingTestUser.email,
    addedBy: ownerTestUser.id,
  });

  await expect(handlers.approve({...})).rejects.toThrow();
});
```

### When Adding New Services

When a new service is added:
1. Add it to `MediaLive` (or relevant bundled layer) - see `standards/patterns/effect-runtime.md`
2. Add it to the test runtime in ALL affected integration test files
3. Run `pnpm --filter @repo/api test` to verify handlers work

```typescript
// When adding CollaboratorRepo, update test runtime:
const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  // ... existing setup
  const collaboratorRepoLayer = CollaboratorRepoLive.pipe(  // NEW
    Layer.provide(ctx.dbLayer),
  );

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    documentRepoLayer,
    podcastRepoLayer,
    collaboratorRepoLayer,  // NEW - must add here too
    queueLayer,
  );
  // ...
};
```

## Anti-Patterns

### Don't Test Via HTTP

```typescript
// WRONG - too slow, requires server
const response = await fetch('http://localhost:3000/api/documents');

// CORRECT - direct handler call
const result = await documentRouter.list.handler({ ... });
```

### Don't Share Runtime Between Tests

```typescript
// WRONG - shared runtime
let runtime: ServerRuntime;
beforeAll(async () => {
  runtime = createServerRuntime({ ... });
});

// CORRECT - fresh runtime per test
beforeEach(async () => {
  runtime = createServerRuntime({ ... });
});
```

### Don't Skip Error Assertions

```typescript
// WRONG - just checking throw
await expect(handler()).rejects.toThrow();

// CORRECT - verify error code
try {
  await handler();
  expect.fail('Should have thrown');
} catch (e) {
  expect(e.code).toBe('NOT_FOUND');
}
```

### Don't Forget Cleanup

```typescript
// WRONG - no cleanup
beforeEach(async () => {
  ctx = await createTestContext();
});

// CORRECT - always cleanup
afterEach(async () => {
  await ctx.cleanup();
});
```
