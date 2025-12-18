# Database Architecture

## Overview

PostgreSQL database accessed via Drizzle ORM with Effect-TS integration for type-safe error handling.

## Query Patterns

### Effect Integration

All database operations use `withDb` from `@repo/effect/db`:

```typescript
import { withDb } from '@repo/effect/db';

const getUser = (id: string) =>
  withDb("users.findById", (db) =>
    db.select().from(users).where(eq(users.id, id))
  );
```

### Error Types

`withDb` automatically maps PostgreSQL errors to specific types:

| PostgreSQL Code | Effect Error | HTTP Status | Description |
|-----------------|--------------|-------------|-------------|
| 23xxx | ConstraintViolationError | 409 | Unique/FK/check constraint violations |
| 40P01 | DeadlockError | 503 | Transaction deadlock detected |
| 08xxx | ConnectionError | 503 | Connection failure |
| Other | DbError | 500 | Generic database error |

All errors preserve the original cause with stack trace for debugging.

### Transactions

For operations requiring atomicity, use Drizzle's transaction API:

```typescript
withDb("podcast.create", (db) =>
  db.transaction(async (tx) => {
    const podcast = await tx.insert(podcasts).values({...}).returning();
    await tx.insert(podcastDocuments).values({...});
    return podcast;
  })
);
```

## Schema Conventions

### Timestamps

All timestamps use timezone-aware mode:

```typescript
createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
  .defaultNow()
  .notNull(),
```

### UUIDs

All primary keys are UUIDs generated at insert time:

```typescript
id: uuid('id').defaultRandom().primaryKey(),
```

### Ownership

All user-created entities have a `createdBy` field:

```typescript
createdBy: uuid('created_by')
  .notNull()
  .references(() => user.id),
```

## Indexes

Key indexes for performance:

- `job_type_status_idx` - Job queue polling
- `job_created_by_idx` - User job lookup
- `podcast_project_idx` - Podcast listing by project

## Repository Pattern

Repositories wrap database operations with the Effect service pattern:

```typescript
// packages/media/src/documents/repository.ts
export const findById = (id: string) =>
  withDb('documents.findById', async (db) => {
    const [doc] = await db.select().from(document).where(eq(document.id, id));
    return doc;
  });
```

## JSONB Fields

Some entities use JSONB for flexible data:

- `podcast.generationContext` - AI generation parameters
- `document.metadata` - Parser-extracted metadata
- `job.payload` / `job.result` - Job-specific data

Validation happens at the application layer via Valibot schemas.
