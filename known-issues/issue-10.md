# refactor: Replace dynamic imports with static imports in podcast use cases

**Issue:** [#10](https://github.com/brandonbryant12/content-studio/issues/10)
**Author:** brandonbryant12
**Created:** 2026-01-03
**State:** OPEN

## Problem

Several podcast use cases bypass the repository layer by using dynamic imports to access the database directly:

```typescript
const { withDb } = await import('@repo/db/effect');
const { podcast: podcastTable } = await import('@repo/db/schema');
const { eq } = await import('drizzle-orm');

return withDb('update', async (db) => {
  return db.update(podcastTable).set({ ownerHasApproved: true }).where(eq(podcastTable.id, id));
});
```

### Issues

1. **Bypasses repository layer** - Data access should go through repos, not direct DB calls in use cases
2. **Dynamic imports are suboptimal** - Async overhead, no static analysis, hidden dependencies
3. **Indicates missing repo methods** - The workaround exists because `PodcastRepo` doesn't expose approval updates

## Affected Files

- `packages/media/src/podcast/use-cases/approve-podcast.ts`
- `packages/media/src/podcast/use-cases/revoke-approval.ts`
- `packages/media/src/podcast/use-cases/add-collaborator.ts`
- `packages/media/src/podcast/use-cases/remove-collaborator.ts`

## Recommended Fix

1. Add proper repository methods for the missing operations (e.g., `podcastRepo.setOwnerApproval()`)
2. Replace direct DB access in use cases with repository calls
3. Use static imports at the top of files

### Before
```typescript
// Use case bypassing repo
const result = yield* Effect.tryPromise({
  try: async () => {
    const { withDb } = await import('@repo/db/effect');
    const { podcast } = await import('@repo/db/schema');
    const { eq } = await import('drizzle-orm');

    return withDb('update', async (db) => {
      return db.update(podcast).set({ ownerHasApproved: true }).where(...);
    });
  },
  catch: (e) => e,
});
```

### After
```typescript
// Use case using repo
const repo = yield* PodcastRepo;
yield* repo.setOwnerApproval(podcastId, true);
```

## Standards Updated

Added anti-pattern to `standards/patterns/use-case.md` documenting this issue.
