# Task 03: Infographic Repository + Use Cases

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/repository.md`
- [ ] `standards/patterns/use-case.md`

## Context

Follow the exact patterns in:
- `packages/media/src/podcast/repos/podcast-repo.ts` — Context.Tag, withDb, Layer.succeed
- `packages/media/src/podcast/use-cases/create-podcast.ts` — getCurrentUser, Effect.gen, Effect.withSpan
- `packages/media/src/podcast/use-cases/save-and-queue-audio.ts` — Queue.enqueue pattern
- `packages/media/src/document/use-cases/get-document-content.ts` — requireOwnership pattern

## Key Files

### Create
- `packages/media/src/infographic/repos/infographic-repo.ts`
- `packages/media/src/infographic/repos/index.ts`
- `packages/media/src/infographic/use-cases/create-infographic.ts`
- `packages/media/src/infographic/use-cases/get-infographic.ts`
- `packages/media/src/infographic/use-cases/list-infographics.ts`
- `packages/media/src/infographic/use-cases/update-infographic.ts`
- `packages/media/src/infographic/use-cases/delete-infographic.ts`
- `packages/media/src/infographic/use-cases/generate-infographic.ts`
- `packages/media/src/infographic/use-cases/get-infographic-versions.ts`
- `packages/media/src/infographic/use-cases/index.ts`
- `packages/media/src/infographic/index.ts`

## Implementation Notes

### Repository Interface
```typescript
export interface InfographicRepoService {
  readonly insert: (data: InsertInfographic) => Effect.Effect<Infographic, DatabaseError, Db>;
  readonly findById: (id: string) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;
  readonly list: (options: { createdBy: string; limit?: number; offset?: number }) => Effect.Effect<readonly Infographic[], DatabaseError, Db>;
  readonly update: (id: string, data: Partial<InsertInfographic>) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;
  readonly insertVersion: (data: InsertInfographicVersion) => Effect.Effect<InfographicVersion, DatabaseError, Db>;
  readonly listVersions: (infographicId: string) => Effect.Effect<readonly InfographicVersion[], DatabaseError, Db>;
  readonly deleteOldVersions: (infographicId: string, keepCount: number) => Effect.Effect<number, DatabaseError, Db>;
}

export class InfographicRepo extends Context.Tag('@repo/media/InfographicRepo')<
  InfographicRepo,
  InfographicRepoService
>() {}
```

### Use Case: create-infographic
```typescript
export interface CreateInfographicInput {
  title: string;
  prompt?: string;
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
  format: InfographicFormat;
  sourceDocumentIds?: string[];
}

export const createInfographic = (input: CreateInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;

    // If sourceDocumentIds provided, verify they belong to user
    if (input.sourceDocumentIds?.length) {
      const docRepo = yield* DocumentRepo;
      yield* Effect.all(
        input.sourceDocumentIds.map(id =>
          docRepo.findById(id) // will fail with DocumentNotFound if missing
        ),
        { concurrency: 'unbounded' }
      );
    }

    return yield* repo.insert({
      id: generateInfographicId(),
      ...input,
      status: 'draft',
      createdBy: user.id,
    });
  }).pipe(Effect.withSpan('useCase.createInfographic'));
```

### Use Case: generate-infographic
This use case enqueues a background job (does NOT do the actual generation):
```typescript
export const generateInfographic = (input: { id: string }) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;
    const queue = yield* Queue;

    const infographic = yield* repo.findById(input.id);
    requireOwnership(infographic.createdBy, user.id); // throws NotInfographicOwner

    // Update status to generating
    yield* repo.update(input.id, { status: 'generating', errorMessage: null });

    // Enqueue job
    yield* queue.enqueue({
      type: 'generate-infographic' as JobType,
      payload: { infographicId: input.id, userId: user.id },
    });

    return infographic;
  }).pipe(Effect.withSpan('useCase.generateInfographic', {
    attributes: { 'infographic.id': input.id }
  }));
```

### Use Case: delete-infographic
Must clean up storage:
```typescript
export const deleteInfographic = (input: { id: string }) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;
    const storage = yield* Storage;

    const infographic = yield* repo.findById(input.id);
    requireOwnership(infographic.createdBy, user.id);

    // Clean up storage for all versions
    const versions = yield* repo.listVersions(input.id);
    yield* Effect.all(
      versions.flatMap(v => [
        v.imageStorageKey ? storage.delete(v.imageStorageKey) : Effect.void,
        v.thumbnailStorageKey ? storage.delete(v.thumbnailStorageKey) : Effect.void,
      ]),
      { concurrency: 5 }
    ).pipe(Effect.catchAll(() => Effect.void)); // Don't fail delete if storage cleanup fails

    // Clean up main image
    if (infographic.imageStorageKey) {
      yield* storage.delete(infographic.imageStorageKey).pipe(Effect.catchAll(() => Effect.void));
    }

    yield* repo.delete(input.id);
  }).pipe(Effect.withSpan('useCase.deleteInfographic'));
```

### requireOwnership helper
Check how other use cases handle this. Either import shared helper or inline:
```typescript
if (infographic.createdBy !== user.id) {
  return yield* new NotInfographicOwner({ infographicId: input.id, userId: user.id });
}
```

## Verification Log

<!-- Agent writes verification results here -->
