# Repository Pattern

This document defines the standard pattern for data access repositories.

## Overview

Repositories handle raw database access without business logic. They:
1. Use Effect's `Context.Tag` for dependency injection
2. Return Effect types with explicit errors
3. Use `withDb` helper for database operations
4. Provide a Layer for runtime composition

## File Location

```
packages/media/src/{domain}/repos/{entity}-repo.ts
packages/media/src/{domain}/repos/index.ts
```

Examples:
- `packages/media/src/document/repos/document-repo.ts`
- `packages/media/src/podcast/repos/podcast-repo.ts`
- `packages/media/src/podcast/repos/script-version-repo.ts`

## Standard Template

```typescript
// packages/media/src/{domain}/repos/{entity}-repo.ts
import { Context, Effect, Layer } from 'effect';
import { entity, type Entity, type EntityId } from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { EntityNotFound } from '@repo/db/errors';
import { eq, desc } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for listing entities.
 */
export interface ListOptions {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for entity operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface EntityRepoService {
  /**
   * Insert a new entity.
   */
  readonly insert: (
    data: InsertEntityInput,
  ) => Effect.Effect<Entity, DatabaseError, Db>;

  /**
   * Find entity by ID.
   * Fails with EntityNotFound if not found.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<Entity, EntityNotFound | DatabaseError, Db>;

  /**
   * List entities with optional filters.
   */
  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Entity[], DatabaseError, Db>;

  /**
   * Update entity by ID.
   * Fails with EntityNotFound if not found.
   */
  readonly update: (
    id: string,
    data: UpdateEntityInput,
  ) => Effect.Effect<Entity, EntityNotFound | DatabaseError, Db>;

  /**
   * Delete entity by ID.
   * Returns true if deleted, false if not found.
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * Count entities with optional filter.
   */
  readonly count: (
    options?: { createdBy?: string },
  ) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class EntityRepo extends Context.Tag('@repo/media/EntityRepo')<
  EntityRepo,
  EntityRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: EntityRepoService = {
  insert: (data) =>
    withDb('entityRepo.insert', async (db) => {
      const [entity] = await db
        .insert(entityTable)
        .values(data)
        .returning();
      return entity!;
    }),

  findById: (id) =>
    withDb('entityRepo.findById', (db) =>
      db
        .select()
        .from(entityTable)
        .where(eq(entityTable.id, id as EntityId))
        .limit(1)
        .then((rows) => rows[0]),
    ).pipe(
      Effect.flatMap((entity) =>
        entity
          ? Effect.succeed(entity)
          : Effect.fail(new EntityNotFound({ id })),
      ),
    ),

  list: (options) =>
    withDb('entityRepo.list', (db) => {
      const conditions = options.createdBy
        ? eq(entityTable.createdBy, options.createdBy)
        : undefined;

      return db
        .select()
        .from(entityTable)
        .where(conditions)
        .orderBy(desc(entityTable.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  update: (id, data) =>
    withDb('entityRepo.update', async (db) => {
      const [entity] = await db
        .update(entityTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(entityTable.id, id as EntityId))
        .returning();
      return entity;
    }).pipe(
      Effect.flatMap((entity) =>
        entity
          ? Effect.succeed(entity)
          : Effect.fail(new EntityNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('entityRepo.delete', async (db) => {
      const result = await db
        .delete(entityTable)
        .where(eq(entityTable.id, id as EntityId))
        .returning({ id: entityTable.id });
      return result.length > 0;
    }),

  count: (options) =>
    withDb('entityRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(entityTable.createdBy, options.createdBy)
        : undefined;
      const [result] = await db
        .select({ count: count() })
        .from(entityTable)
        .where(conditions);
      return result?.count ?? 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const EntityRepoLive: Layer.Layer<EntityRepo, never, Db> =
  Layer.succeed(EntityRepo, make);
```

## Structure

### 1. Types Section

Define helper types like `ListOptions` or composite types:

```typescript
export interface ListOptions {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

// Composite types for joins
export interface PodcastWithDocuments extends Podcast {
  documents: Document[];
}
```

### 2. Service Interface

Define the repository contract with JSDoc:

```typescript
export interface EntityRepoService {
  /**
   * Find entity by ID.
   * Fails with EntityNotFound if not found.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<Entity, EntityNotFound | DatabaseError, Db>;
}
```

### 3. Context Tag

Create the Effect Context.Tag:

```typescript
export class EntityRepo extends Context.Tag('@repo/media/EntityRepo')<
  EntityRepo,
  EntityRepoService
>() {}
```

**Naming convention:** `@repo/{package}/{EntityRepo}`

### 4. Implementation

Implement the interface using `withDb`:

```typescript
const make: EntityRepoService = {
  findById: (id) =>
    withDb('entityRepo.findById', (db) => /* ... */),
};
```

### 5. Layer

Export the Layer for composition:

```typescript
export const EntityRepoLive: Layer.Layer<EntityRepo, never, Db> =
  Layer.succeed(EntityRepo, make);
```

## Rules

### 1. No Business Logic

Repositories only do database operations. Business logic goes in use cases.

```typescript
// WRONG - business logic in repo
readonly create: (data) => {
  if (data.wordCount > MAX_WORDS) {
    return Effect.fail(new DocumentTooLarge());  // Business rule!
  }
  return withDb('repo.create', /* ... */);
}

// CORRECT - pure data access
readonly insert: (data) =>
  withDb('repo.insert', async (db) => {
    const [doc] = await db.insert(table).values(data).returning();
    return doc!;
  }),
```

### 2. Explicit Error Types

All errors must be explicit in the Effect type:

```typescript
// CORRECT
readonly findById: (
  id: string,
) => Effect.Effect<Entity, EntityNotFound | DatabaseError, Db>;

// WRONG - missing error type
readonly findById: (id: string) => Effect.Effect<Entity, never, Db>;
```

### 3. Use withDb Helper

All database operations use `withDb` for tracing and connection handling:

```typescript
// CORRECT
findById: (id) =>
  withDb('entityRepo.findById', (db) =>
    db.select().from(table).where(eq(table.id, id)).limit(1)
  ),

// WRONG - direct db access without withDb
findById: (id) =>
  Effect.gen(function* () {
    const db = yield* Db;
    return db.select().from(table).where(eq(table.id, id));
  }),
```

### 4. Span Naming in withDb

First argument to `withDb` is the span name:

```typescript
withDb('entityRepo.methodName', async (db) => { ... })
```

Format: `{repoName}.{methodName}`

### 5. Handle Not Found

Use `Effect.flatMap` to convert null to NotFound error:

```typescript
findById: (id) =>
  withDb('repo.findById', (db) =>
    db.select().from(table).where(eq(table.id, id)).limit(1).then(r => r[0])
  ).pipe(
    Effect.flatMap((entity) =>
      entity
        ? Effect.succeed(entity)
        : Effect.fail(new EntityNotFound({ id })),
    ),
  ),
```

### 6. Cast Branded IDs

Cast string IDs to branded types when querying:

```typescript
.where(eq(table.id, id as EntityId))
```

### 7. Require Db Context

All methods should have `Db` in their requirements:

```typescript
Effect.Effect<Entity, Error, Db>
//                           ^^ Required
```

## Common Methods

| Method | Returns | Error on Missing |
|--------|---------|------------------|
| `insert` | Entity | (throws on constraint violation) |
| `findById` | Entity | `EntityNotFound` |
| `list` | Entity[] | (empty array) |
| `update` | Entity | `EntityNotFound` |
| `delete` | boolean | (returns false) |
| `count` | number | (returns 0) |

## Index File

Export repo and layer from index:

```typescript
// packages/media/src/{domain}/repos/index.ts
export { EntityRepo, EntityRepoLive, type EntityRepoService } from './entity-repo';
export type { ListOptions } from './entity-repo';
```

## Composite Queries

For queries that join multiple tables:

```typescript
export interface PodcastWithDocuments extends Podcast {
  documents: Document[];
}

readonly findByIdFull: (
  id: string,
) => Effect.Effect<PodcastWithDocuments, PodcastNotFound | DatabaseError, Db>;
```

Implementation:

```typescript
findByIdFull: (id) =>
  withDb('podcastRepo.findByIdFull', async (db) => {
    // Query podcast
    const [pod] = await db.select().from(podcast).where(eq(podcast.id, id)).limit(1);
    if (!pod) return null;

    // Query related documents
    const docs = await db.select().from(document)
      .where(inArray(document.id, pod.sourceDocumentIds));

    return { ...pod, documents: docs };
  }).pipe(
    Effect.flatMap((result) =>
      result ? Effect.succeed(result) : Effect.fail(new PodcastNotFound({ id }))
    ),
  ),
```

## Anti-Patterns

### Don't Access User Context

```typescript
// WRONG - accessing user in repo
readonly findById: (id) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;  // No user context in repos!
    const db = yield* Db;
    // ...
  }),

// CORRECT - user filtering passed as parameter
readonly findById: (id, userId) =>
  withDb('repo.findById', (db) =>
    db.select().from(table)
      .where(and(eq(table.id, id), eq(table.createdBy, userId)))
  ),
```

### Don't Return Optional from findById

```typescript
// WRONG - returning null
readonly findById: (id) => Effect.Effect<Entity | null, DatabaseError, Db>;

// CORRECT - fail with NotFound
readonly findById: (id) => Effect.Effect<Entity, EntityNotFound | DatabaseError, Db>;
```

### Don't Skip withDb

```typescript
// WRONG - no tracing
findById: (id) =>
  Effect.tryPromise(() =>
    db.select().from(table).where(eq(table.id, id))
  ),

// CORRECT - with tracing
findById: (id) =>
  withDb('repo.findById', (db) =>
    db.select().from(table).where(eq(table.id, id))
  ),
```

### Don't Serialize in Repos

```typescript
// WRONG - serialization in repo
readonly findById: (id) =>
  withDb('repo.findById', async (db) => {
    const entity = await db.select()...;
    return serializeEntity(entity);  // Don't serialize!
  }),

// CORRECT - return raw entity
readonly findById: (id) =>
  withDb('repo.findById', (db) =>
    db.select().from(table).where(eq(table.id, id))
  ),
```
