# Use Case Unit Tests

This document defines the standard pattern for testing use cases.

## Overview

Every use case must have unit tests covering:
1. Success paths
2. All error conditions
3. Edge cases (empty results, pagination)

## File Location

```
packages/media/src/{domain}/use-cases/__tests__/{action}.test.ts
packages/ai/src/{domain}/use-cases/__tests__/{action}.test.ts
```

## Standard Test Template

```typescript
// packages/media/src/document/use-cases/__tests__/get-document.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Effect } from 'effect';
import { createTestContext, TestContext } from '@repo/testing';
import { withTestUser } from '@repo/testing';
import { DocumentFactory, UserFactory } from '@repo/testing';
import { getDocument } from '../get-document';

describe('getDocument', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('success cases', () => {
    it('returns document when found', async () => {
      // Arrange
      const user = await UserFactory.create(ctx.db);
      const doc = await DocumentFactory.create(ctx.db, { userId: user.id });

      // Act
      const result = await Effect.runPromise(
        withTestUser(user)(
          getDocument({ id: doc.id })
        ).pipe(Effect.provide(ctx.layers))
      );

      // Assert
      expect(result.id).toBe(doc.id);
      expect(result.title).toBe(doc.title);
    });
  });

  describe('error cases', () => {
    it('fails with DocumentNotFound when document does not exist', async () => {
      const user = await UserFactory.create(ctx.db);

      await expect(
        Effect.runPromise(
          withTestUser(user)(
            getDocument({ id: 'doc_nonexistent' })
          ).pipe(Effect.provide(ctx.layers))
        )
      ).rejects.toThrow('DocumentNotFound');
    });

    it('fails with DocumentNotFound when document belongs to another user', async () => {
      const user1 = await UserFactory.create(ctx.db);
      const user2 = await UserFactory.create(ctx.db);
      const doc = await DocumentFactory.create(ctx.db, { userId: user1.id });

      await expect(
        Effect.runPromise(
          withTestUser(user2)(
            getDocument({ id: doc.id })
          ).pipe(Effect.provide(ctx.layers))
        )
      ).rejects.toThrow('DocumentNotFound');
    });
  });
});
```

## Test Categories

### 1. Success Cases

Test the happy path with valid inputs.

```typescript
describe('success cases', () => {
  it('creates document with valid input', async () => {
    const user = await UserFactory.create(ctx.db);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createDocument({
          title: 'Test Document',
          content: 'Hello world',
        })
      ).pipe(Effect.provide(ctx.layers))
    );

    expect(result.id).toMatch(/^doc_/);
    expect(result.title).toBe('Test Document');
    expect(result.wordCount).toBe(2);
  });
});
```

### 2. Error Cases

Test every error in the error union.

```typescript
describe('error cases', () => {
  it('fails with DocumentNotFound when not found', async () => {
    // ...
  });

  it('fails with DocumentQuotaExceeded when over limit', async () => {
    const user = await UserFactory.create(ctx.db, {
      plan: 'free'
    });

    // Create max documents for free plan
    for (let i = 0; i < 5; i++) {
      await DocumentFactory.create(ctx.db, { userId: user.id });
    }

    await expect(
      Effect.runPromise(
        withTestUser(user)(
          createDocument({ title: 'One More', content: 'test' })
        ).pipe(Effect.provide(ctx.layers))
      )
    ).rejects.toThrow('DocumentQuotaExceeded');
  });

  it('fails with UnsupportedFormat for invalid file type', async () => {
    const user = await UserFactory.create(ctx.db);

    await expect(
      Effect.runPromise(
        withTestUser(user)(
          uploadDocument({
            file: new Blob(['test'], { type: 'application/octet-stream' }),
            fileName: 'test.exe',
          })
        ).pipe(Effect.provide(ctx.layers))
      )
    ).rejects.toThrow('UnsupportedFormat');
  });
});
```

### 3. Edge Cases

Test boundary conditions and special scenarios.

```typescript
describe('edge cases', () => {
  it('returns empty array when user has no documents', async () => {
    const user = await UserFactory.create(ctx.db);

    const result = await Effect.runPromise(
      withTestUser(user)(
        listDocuments({ limit: 10, offset: 0 })
      ).pipe(Effect.provide(ctx.layers))
    );

    expect(result).toEqual([]);
  });

  it('respects pagination limit', async () => {
    const user = await UserFactory.create(ctx.db);
    for (let i = 0; i < 10; i++) {
      await DocumentFactory.create(ctx.db, { userId: user.id });
    }

    const result = await Effect.runPromise(
      withTestUser(user)(
        listDocuments({ limit: 5, offset: 0 })
      ).pipe(Effect.provide(ctx.layers))
    );

    expect(result).toHaveLength(5);
  });

  it('respects pagination offset', async () => {
    const user = await UserFactory.create(ctx.db);
    const docs = [];
    for (let i = 0; i < 10; i++) {
      docs.push(await DocumentFactory.create(ctx.db, { userId: user.id }));
    }

    const result = await Effect.runPromise(
      withTestUser(user)(
        listDocuments({ limit: 5, offset: 5 })
      ).pipe(Effect.provide(ctx.layers))
    );

    expect(result).toHaveLength(5);
    expect(result[0].id).not.toBe(docs[0].id);
  });

  it('handles empty content', async () => {
    const user = await UserFactory.create(ctx.db);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createDocument({ title: 'Empty', content: '' })
      ).pipe(Effect.provide(ctx.layers))
    );

    expect(result.wordCount).toBe(0);
  });
});
```

### 4. Authorization Cases

Test user isolation and permissions.

```typescript
describe('authorization', () => {
  it('user can only see their own documents', async () => {
    const user1 = await UserFactory.create(ctx.db);
    const user2 = await UserFactory.create(ctx.db);

    await DocumentFactory.create(ctx.db, { userId: user1.id });
    await DocumentFactory.create(ctx.db, { userId: user2.id });

    const result = await Effect.runPromise(
      withTestUser(user1)(
        listDocuments({ limit: 10, offset: 0 })
      ).pipe(Effect.provide(ctx.layers))
    );

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(user1.id);
  });

  it('cannot update another user\'s document', async () => {
    const user1 = await UserFactory.create(ctx.db);
    const user2 = await UserFactory.create(ctx.db);
    const doc = await DocumentFactory.create(ctx.db, { userId: user1.id });

    await expect(
      Effect.runPromise(
        withTestUser(user2)(
          updateDocument({ id: doc.id, title: 'Hacked' })
        ).pipe(Effect.provide(ctx.layers))
      )
    ).rejects.toThrow('DocumentNotFound');
  });
});
```

## Test Utilities

### Test Context

```typescript
import { createTestContext, TestContext } from '@repo/testing';

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx.cleanup();
});
```

### Test User

```typescript
import { withTestUser } from '@repo/testing';

const result = await Effect.runPromise(
  withTestUser(testUser)(effect).pipe(
    Effect.provide(ctx.layers)
  )
);
```

### Factories

```typescript
import {
  UserFactory,
  DocumentFactory,
  PodcastFactory
} from '@repo/testing';

// Create with defaults
const user = await UserFactory.create(ctx.db);

// Create with overrides
const doc = await DocumentFactory.create(ctx.db, {
  userId: user.id,
  title: 'Custom Title',
});

// Build without persisting
const docData = DocumentFactory.build({ title: 'Not Saved' });
```

## Assertion Patterns

### Check Error Type

```typescript
await expect(
  Effect.runPromise(useCase())
).rejects.toThrow('ErrorTagName');
```

### Check Error Properties

```typescript
try {
  await Effect.runPromise(useCase());
  expect.fail('Should have thrown');
} catch (e) {
  expect(e._tag).toBe('DocumentNotFound');
  expect(e.id).toBe('doc_123');
}
```

### Check Effect.Exit

```typescript
const exit = await Effect.runPromiseExit(useCase());

expect(Exit.isFailure(exit)).toBe(true);
if (Exit.isFailure(exit)) {
  const error = Cause.failureOption(exit.cause);
  expect(Option.isSome(error)).toBe(true);
  expect(error.value._tag).toBe('DocumentNotFound');
}
```

## Coverage Requirements

Every use case test file should cover:

| Category | Minimum Tests |
|----------|---------------|
| Success cases | 1-3 |
| Error cases | 1 per error type |
| Edge cases | 1-3 |
| Authorization | 1-2 |

## Anti-Patterns

### Don't Share State Between Tests

```typescript
// WRONG - shared state
let sharedDoc: Document;
beforeAll(async () => {
  sharedDoc = await DocumentFactory.create(ctx.db);
});

// CORRECT - isolated per test
it('test 1', async () => {
  const doc = await DocumentFactory.create(ctx.db);
});
```

### Don't Skip Error Cases

```typescript
// WRONG - only testing happy path
describe('getDocument', () => {
  it('returns document', async () => { ... });
  // Missing: NotFound, unauthorized, etc.
});

// CORRECT - all error paths
describe('getDocument', () => {
  it('returns document when found', async () => { ... });
  it('fails with DocumentNotFound when not exists', async () => { ... });
  it('fails with DocumentNotFound for other user', async () => { ... });
});
```

### Don't Test Implementation Details

```typescript
// WRONG - testing internal method calls
expect(mockRepo.findById).toHaveBeenCalledWith(id);

// CORRECT - testing observable behavior
expect(result.id).toBe(expectedId);
```
