# Task 09: Tests

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/testing/use-case-tests.md`
- [ ] `standards/testing/integration-tests.md`
- [ ] `standards/frontend/testing.md`

## Context

Follow the exact patterns in:
- `packages/media/src/test-utils/` — Mock repo factories (e.g., `createMockPodcastRepo`)
- `packages/media/src/podcast/use-cases/__tests__/` — Use case test patterns with `withTestUser`
- `apps/web/src/features/podcasts/components/__tests__/` — Frontend component tests
- `packages/media/src/test-utils/factories.ts` — Test data factories

## Key Files

### Create
- `packages/media/src/test-utils/mock-infographic-repo.ts`
- `packages/media/src/infographic/use-cases/__tests__/create-infographic.test.ts`
- `packages/media/src/infographic/use-cases/__tests__/get-infographic.test.ts`
- `packages/media/src/infographic/use-cases/__tests__/list-infographics.test.ts`
- `packages/media/src/infographic/use-cases/__tests__/update-infographic.test.ts`
- `packages/media/src/infographic/use-cases/__tests__/delete-infographic.test.ts`
- `packages/media/src/infographic/use-cases/__tests__/generate-infographic.test.ts`
- `packages/media/src/infographic/use-cases/__tests__/get-infographic-versions.test.ts`
- `packages/media/src/infographic/__tests__/prompts.test.ts`
- `apps/web/src/features/infographics/components/__tests__/infographic-list.test.tsx`
- `apps/web/src/features/infographics/components/__tests__/infographic-workbench.test.tsx`

## Implementation Notes

### Mock Repository Factory

```typescript
// packages/media/src/test-utils/mock-infographic-repo.ts
import { Effect, Layer } from 'effect';
import { InfographicRepo, type InfographicRepoService } from '../infographic/repos';

export const createMockInfographicRepo = (
  overrides: Partial<InfographicRepoService> = {},
): Layer.Layer<InfographicRepo> => {
  const defaults: InfographicRepoService = {
    insert: () => Effect.die('insert not mocked'),
    findById: () => Effect.die('findById not mocked'),
    list: () => Effect.die('list not mocked'),
    update: () => Effect.die('update not mocked'),
    delete: () => Effect.die('delete not mocked'),
    insertVersion: () => Effect.die('insertVersion not mocked'),
    listVersions: () => Effect.die('listVersions not mocked'),
    deleteOldVersions: () => Effect.die('deleteOldVersions not mocked'),
  };

  return Layer.succeed(InfographicRepo, { ...defaults, ...overrides });
};
```

### Use Case Tests Pattern

```typescript
// create-infographic.test.ts
import { Effect } from 'effect';
import { describe, it, expect } from 'vitest';
import { withTestUser } from '@repo/testing';
import { createInfographic } from '../create-infographic';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';

describe('createInfographic', () => {
  const testUser = { id: 'user_123', email: 'test@test.com' };

  it('creates an infographic with valid input', async () => {
    const mockInsert = vi.fn().mockImplementation((data) =>
      Effect.succeed({ ...data, createdAt: new Date(), updatedAt: new Date() })
    );

    const repo = createMockInfographicRepo({ insert: mockInsert });

    const result = await Effect.runPromise(
      withTestUser(testUser)(
        createInfographic({
          title: 'Test Infographic',
          infographicType: 'timeline',
          stylePreset: 'modern_minimal',
          format: 'portrait',
        })
      ).pipe(Effect.provide(repo))
    );

    expect(result.title).toBe('Test Infographic');
    expect(result.createdBy).toBe(testUser.id);
    expect(result.status).toBe('draft');
  });

  it('fails when user is not authenticated', async () => {
    // Test without withTestUser - should fail
  });
});
```

### Test Coverage Required

**Use Case Tests:**
- `create-infographic`: creates with valid input, validates document ownership, sets default status
- `get-infographic`: returns infographic, fails with NotFound for missing, fails for wrong owner
- `list-infographics`: returns user's infographics, respects limit/offset
- `update-infographic`: updates fields, fails for wrong owner, fails for missing
- `delete-infographic`: deletes with storage cleanup, fails for wrong owner
- `generate-infographic`: enqueues job, updates status to generating, fails for wrong owner
- `get-infographic-versions`: returns versions, fails for missing infographic

**Prompt Builder Tests:**
- Each type produces expected directive keywords
- Each style produces expected modifiers
- Format dimensions are correct
- Document content is included when provided
- Prompt stays under 250 words (approximate check)

**Frontend Tests:**
- List renders infographic cards
- Delete shows confirmation dialog
- Create navigates to workbench
- Workbench renders all panels
- Generate button disabled when generating
- Version selection updates preview

### No `as any`
All test mocks must be properly typed. Use the `createMockInfographicRepo` factory with typed overrides instead of manual `as any` stubs.

## Verification Log

<!-- Agent writes verification results here -->
