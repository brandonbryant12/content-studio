# Job Workflow Tests

This document defines the standard pattern for testing background job workflows end-to-end.

## Overview

Job workflow tests verify that the **full API → Queue → Worker flow** works correctly. They catch state mismatches between:

1. What the API sets up before enqueueing a job
2. What the worker expects when processing the job

## Why This Matters

Consider this real bug: An API use case set the voiceover status to `generating_audio` before enqueueing a job, but the worker use case only accepted `drafting`, `ready`, or `failed` statuses. Unit tests passed because they tested each use case in isolation, but the production flow failed.

Job workflow tests catch these issues by testing the actual sequence of use case calls.

Queue note: when enqueue writes directly to the `job` table, workflow tests should still verify workers can claim and process pending jobs end-to-end.

## File Location

```
packages/api/src/server/router/__tests__/{entity}-workflow.test.ts
```

## Test Categories

### 1. API → Worker Flow Tests

Test that after the API enqueues a job, the worker can successfully process it:

```typescript
it('worker can process job after API enqueues it', async () => {
  // Arrange: Create entity in initial state
  const voiceover = await insertTestVoiceover(ctx, userId, {
    status: 'drafting',
    text: 'Some text.',
  });

  // Step 1: API enqueues job
  const startResult = await runtime.runPromise(
    withCurrentUser(user)(
      startVoiceoverGeneration({
        voiceoverId: voiceover.id,
        userId: user.id,
      }),
    ),
  );

  expect(startResult.jobId).toBeDefined();

  // Step 2: Worker processes job (using the EXACT same use case the worker calls)
  const generateResult = await runtime.runPromise(
    withCurrentUser(user)(
      generateVoiceoverAudio({
        voiceoverId: voiceover.id,
        userId: user.id,
      }),
    ),
  );

  expect(generateResult.audioUrl).toBeDefined();
});
```

### 2. State Validation Tests

Document and verify the expected state transitions:

```typescript
it('API and worker use consistent status expectations', async () => {
  const statusHistory: string[] = [];

  // Initial
  statusHistory.push(initial.status);

  // After API call
  await runtime.runPromise(startGeneration({ ... }));
  statusHistory.push(afterApi.status);

  // After worker processing
  await runtime.runPromise(generateAudio({ ... }));
  statusHistory.push(afterWorker.status);

  // Document expected transitions
  expect(statusHistory).toEqual([
    'drafting',           // Initial
    'generating_audio',   // After API enqueues
    'ready',              // After worker completes
  ]);
});
```

### 3. Status Alignment Tests

Explicitly test that the worker accepts the status that the API sets:

```typescript
it('worker accepts status that API sets before enqueueing', async () => {
  // Simulate what the API does
  await db.update(table).set({ status: 'generating_audio' });

  // Worker should be able to process from this status
  // This is the KEY test that catches status mismatch bugs
  const result = await runtime.runPromise(
    generateAudio({ podcastId: podcast.id }),
  );

  expect(result.status).toBe('ready');
});
```

### 4. Idempotency Tests

Verify duplicate job requests return the existing job:

```typescript
it('returns existing pending job when called twice', async () => {
  const result1 = await runtime.runPromise(startGeneration({ ... }));
  const result2 = await runtime.runPromise(startGeneration({ ... }));

  expect(result1.jobId).toBe(result2.jobId);
});
```

## Standard Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Layer, ManagedRuntime } from 'effect';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  type TestContext,
} from '@repo/testing';
import {
  createInMemoryStorage,
  MockLLMLive,
  MockTTSLive,
} from '@repo/testing/mocks';
import { withCurrentUser, Role, type User } from '@repo/auth/policy';

// =============================================================================
// Test Setup
// =============================================================================

let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

const createWorkflowRuntime = (ctx: TestContext) => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    MockLLMLive,
    MockTTSLive,
    inMemoryStorage.layer,
  );

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    EntityRepoLive.pipe(Layer.provide(ctx.dbLayer)),
    QueueLive.pipe(Layer.provide(ctx.dbLayer)),
  );

  return ManagedRuntime.make(allLayers);
};

// =============================================================================
// Tests
// =============================================================================

describe('entity job workflow', () => {
  let ctx: TestContext;
  let runtime: ReturnType<typeof createWorkflowRuntime>;
  let testUser: ReturnType<typeof createTestUser>;
  let user: User;

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createWorkflowRuntime(ctx);
    testUser = createTestUser();
    user = {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: Role.USER,
    };
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  describe('API → Worker flow', () => {
    it('worker can process job after API enqueues it', async () => {
      // Test implementation
    });
  });

  describe('state validation', () => {
    it('documents expected state transitions', async () => {
      // Test implementation
    });

    it('worker accepts status that API sets', async () => {
      // Test implementation
    });
  });

  describe('idempotency', () => {
    it('returns existing pending job', async () => {
      // Test implementation
    });
  });
});
```

## Multi-Phase Workflows

Some jobs have multiple phases (e.g., podcast: generateScript → generateAudio):

```typescript
it('full generation workflow works end-to-end', async () => {
  // API enqueues job
  await runtime.runPromise(startGeneration({ podcastId }));

  // Worker Phase 1: Script generation
  await runtime.runPromise(generateScript({ podcastId }));
  expect(afterScript.status).toBe('script_ready');

  // Worker Phase 2: Audio generation
  await runtime.runPromise(generateAudio({ podcastId }));
  expect(afterAudio.status).toBe('ready');
});
```

## Seeding Storage Content

When tests need document content, seed it into in-memory storage:

```typescript
const insertTestDocument = async (ctx, userId, options = {}) => {
  const doc = createTestDocument({ createdBy: userId, ...options });
  await ctx.db.insert(documentTable).values(doc);

  // Seed content into storage
  inMemoryStorage.getStore().set(doc.contentKey, {
    data: Buffer.from('Test content'),
    contentType: 'text/plain',
  });

  return doc;
};
```

## Coverage Requirements

Every job type MUST have workflow tests covering:

| Test Category | Purpose |
|---------------|---------|
| API → Worker flow | Verifies full workflow works |
| State transitions | Documents expected status changes |
| Status alignment | Catches API/worker status mismatches |
| Idempotency | Verifies duplicate handling |

## When to Add Workflow Tests

Add workflow tests whenever:

1. Creating a new job type
2. Adding a new API endpoint that enqueues jobs
3. Modifying status transitions in API or worker use cases
4. Fixing bugs related to job processing

## Anti-Patterns

### Don't Test Use Cases in Isolation Only

```typescript
// WRONG - Only tests worker in isolation
it('generates audio', async () => {
  const voiceover = { status: 'drafting' }; // Manual setup, not API-set
  await generateAudio({ ... });
});

// CORRECT - Tests after API has set up state
it('worker processes after API enqueues', async () => {
  await startGeneration({ ... }); // API sets up state
  await generateAudio({ ... });   // Worker processes
});
```

### Don't Skip Status Assertions

```typescript
// WRONG - Doesn't verify intermediate states
it('full flow works', async () => {
  await startGeneration({ ... });
  await generateAudio({ ... });
  expect(result).toBeDefined();
});

// CORRECT - Verifies each status transition
it('full flow works', async () => {
  await startGeneration({ ... });
  expect(afterStart.status).toBe('generating_audio');

  await generateAudio({ ... });
  expect(afterAudio.status).toBe('ready');
});
```

### Don't Forget to Use Real Use Cases

```typescript
// WRONG - Manually simulating what API does
await db.update(table).set({ status: 'generating' });

// CORRECT - Actually call the API use case
await runtime.runPromise(startGeneration({ ... }));
```

## Relationship to Other Test Types

| Test Type | Focus | Catches |
|-----------|-------|---------|
| Unit tests | Individual use case logic | Logic bugs in isolation |
| Integration tests | Handler → Use case → DB | Missing services, serialization |
| **Workflow tests** | API → Queue → Worker | State mismatches between layers |

Workflow tests complement, not replace, unit and integration tests.
