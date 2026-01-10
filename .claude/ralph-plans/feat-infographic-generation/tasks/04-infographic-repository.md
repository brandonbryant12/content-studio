# Task 04: Infographic Repository

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/repository.md`
- [ ] `packages/media/src/podcast/repos/podcast-repo.ts` - Reference implementation
- [ ] `packages/media/src/voiceover/repos/voiceover-repo.ts` - Simpler reference

## Context

Repositories in this codebase:
- Use Effect's `Context.Tag` for dependency injection
- Wrap database operations in Effect
- Use Drizzle ORM (no raw SQL)
- Include tracing spans for observability
- Handle errors with domain-specific error types

## Key Files

### Create New Files:
- `packages/media/src/infographic/repos/infographic-repo.ts`
- `packages/media/src/infographic/repos/selection-repo.ts`
- `packages/media/src/infographic/repos/index.ts`

## Implementation Notes

### Infographic Repository

```typescript
import { Context, Effect, Layer } from 'effect';
import { eq, and, desc, sql } from 'drizzle-orm';
import { withDb, type DbContext } from '@repo/db';
import {
  infographic,
  infographicSelection,
  type InfographicId,
  type InfographicStatus,
} from '@repo/db/schemas';

export interface InfographicRepo {
  readonly insert: (data: InsertInfographic) => Effect.Effect<Infographic, InfographicRepoError>;

  readonly findById: (id: InfographicId) => Effect.Effect<Infographic | null, InfographicRepoError>;

  readonly findByIdFull: (id: InfographicId) => Effect.Effect<InfographicFull | null, InfographicRepoError>;

  readonly update: (
    id: InfographicId,
    data: UpdateInfographic,
  ) => Effect.Effect<Infographic, InfographicRepoError>;

  readonly delete: (id: InfographicId) => Effect.Effect<void, InfographicRepoError>;

  readonly list: (params: ListParams) => Effect.Effect<Infographic[], InfographicRepoError>;

  readonly count: (userId: string) => Effect.Effect<number, InfographicRepoError>;

  readonly updateStatus: (
    id: InfographicId,
    status: InfographicStatus,
    errorMessage?: string,
  ) => Effect.Effect<Infographic, InfographicRepoError>;

  readonly updateImage: (
    id: InfographicId,
    imageUrl: string,
  ) => Effect.Effect<Infographic, InfographicRepoError>;

  readonly clearImage: (id: InfographicId) => Effect.Effect<Infographic, InfographicRepoError>;

  readonly updateGenerationContext: (
    id: InfographicId,
    context: GenerationContext,
  ) => Effect.Effect<Infographic, InfographicRepoError>;
}

export class InfographicRepo extends Context.Tag('@repo/media/InfographicRepo')<
  InfographicRepo,
  InfographicRepo
>() {}
```

### Key Implementation Patterns

```typescript
// Insert with validation
const insert: InfographicRepo['insert'] = (data) =>
  withDb((db) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db
          .insert(infographic)
          .values({
            title: data.title,
            infographicType: data.infographicType,
            aspectRatio: data.aspectRatio ?? '1:1',
            sourceDocumentIds: data.sourceDocumentIds,
            createdBy: data.createdBy,
          })
          .returning();
        return row;
      },
      catch: (error) => new InfographicRepoError({ message: 'Failed to insert', cause: error }),
    }),
  ).pipe(Effect.withSpan('infographicRepo.insert'));

// Find by ID with selections (full)
const findByIdFull: InfographicRepo['findByIdFull'] = (id) =>
  withDb((db) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db
          .select()
          .from(infographic)
          .where(eq(infographic.id, id))
          .limit(1);

        if (!row) return null;

        const selections = await db
          .select()
          .from(infographicSelection)
          .where(eq(infographicSelection.infographicId, id))
          .orderBy(infographicSelection.orderIndex);

        return { ...row, selections };
      },
      catch: (error) => new InfographicRepoError({ message: 'Failed to find', cause: error }),
    }),
  ).pipe(Effect.withSpan('infographicRepo.findByIdFull', { attributes: { 'infographic.id': id } }));

// List with pagination
const list: InfographicRepo['list'] = ({ userId, limit, offset }) =>
  withDb((db) =>
    Effect.tryPromise({
      try: async () => {
        return db
          .select()
          .from(infographic)
          .where(eq(infographic.createdBy, userId))
          .orderBy(desc(infographic.createdAt))
          .limit(limit)
          .offset(offset);
      },
      catch: (error) => new InfographicRepoError({ message: 'Failed to list', cause: error }),
    }),
  ).pipe(Effect.withSpan('infographicRepo.list'));

// Status update
const updateStatus: InfographicRepo['updateStatus'] = (id, status, errorMessage) =>
  withDb((db) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db
          .update(infographic)
          .set({
            status,
            errorMessage: errorMessage ?? null,
            updatedAt: new Date(),
          })
          .where(eq(infographic.id, id))
          .returning();
        return row;
      },
      catch: (error) => new InfographicRepoError({ message: 'Failed to update status', cause: error }),
    }),
  ).pipe(Effect.withSpan('infographicRepo.updateStatus', { attributes: { 'infographic.id': id, status } }));
```

### Selection Repository

```typescript
export interface SelectionRepo {
  readonly insert: (data: InsertSelection) => Effect.Effect<Selection, SelectionRepoError>;

  readonly findByInfographic: (
    infographicId: InfographicId,
  ) => Effect.Effect<Selection[], SelectionRepoError>;

  readonly update: (
    id: InfographicSelectionId,
    data: UpdateSelection,
  ) => Effect.Effect<Selection, SelectionRepoError>;

  readonly delete: (id: InfographicSelectionId) => Effect.Effect<void, SelectionRepoError>;

  readonly reorder: (
    infographicId: InfographicId,
    orderedIds: InfographicSelectionId[],
  ) => Effect.Effect<void, SelectionRepoError>;

  readonly bulkInsert: (
    data: InsertSelection[],
  ) => Effect.Effect<Selection[], SelectionRepoError>;

  readonly count: (infographicId: InfographicId) => Effect.Effect<number, SelectionRepoError>;
}

export class SelectionRepo extends Context.Tag('@repo/media/SelectionRepo')<
  SelectionRepo,
  SelectionRepo
>() {}
```

### Selection Repo Key Methods

```typescript
// Reorder using transaction
const reorder: SelectionRepo['reorder'] = (infographicId, orderedIds) =>
  withDb((db) =>
    Effect.tryPromise({
      try: async () => {
        await db.transaction(async (tx) => {
          for (let i = 0; i < orderedIds.length; i++) {
            await tx
              .update(infographicSelection)
              .set({ orderIndex: i })
              .where(
                and(
                  eq(infographicSelection.id, orderedIds[i]),
                  eq(infographicSelection.infographicId, infographicId),
                ),
              );
          }
        });
      },
      catch: (error) => new SelectionRepoError({ message: 'Failed to reorder', cause: error }),
    }),
  ).pipe(Effect.withSpan('selectionRepo.reorder'));

// Count for limit checking
const count: SelectionRepo['count'] = (infographicId) =>
  withDb((db) =>
    Effect.tryPromise({
      try: async () => {
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(infographicSelection)
          .where(eq(infographicSelection.infographicId, infographicId));
        return result?.count ?? 0;
      },
      catch: (error) => new SelectionRepoError({ message: 'Failed to count', cause: error }),
    }),
  ).pipe(Effect.withSpan('selectionRepo.count'));
```

### Layer Creation

```typescript
export const InfographicRepoLive = Layer.succeed(InfographicRepo, {
  insert,
  findById,
  findByIdFull,
  update,
  delete: deleteInfographic,
  list,
  count,
  updateStatus,
  updateImage,
  clearImage,
  updateGenerationContext,
});

export const SelectionRepoLive = Layer.succeed(SelectionRepo, {
  insert,
  findByInfographic,
  update,
  delete: deleteSelection,
  reorder,
  bulkInsert,
  count,
});
```

## Verification Log

<!-- Agent writes verification results here -->
