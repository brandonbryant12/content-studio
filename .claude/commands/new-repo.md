---
description: Generate a repository with Effect patterns
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: "<RepoName> <table-name> [package-path]"
---

# Generate Repository

Generate a new Effect-TS repository following the project's withDb pattern.

## Usage

```
/new-repo Players players packages/card
```

## Arguments

- `RepoName`: Name of the repository (e.g., Players, Positions, Invites)
- `table-name`: Drizzle table name (e.g., players, positions, invites)
- `package-path` (optional): Target package path

## Instructions

Parse the $ARGUMENTS to extract:
1. Repo name (first argument)
2. Table name (second argument)
3. Package path (third argument, optional)

Then generate the following file:

### Template: repos/{repo-name}-repo.ts

```typescript
import { withDb, type Db, type DbError } from '@repo/db';
import { type Effect } from 'effect';
import type { ${EntityType} } from '../types';

/**
 * ${RepoName} Repository
 *
 * All methods return Effect with DbError in error channel.
 * Uses Drizzle query builder (NOT raw SQL).
 */

export const getById = (
  id: string,
): Effect.Effect<${EntityType} | null, DbError, typeof Db.Identifier> =>
  withDb(async (db) => {
    return db.query.${tableName}.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
  });

export const getByIdForUser = (
  id: string,
  userId: string,
): Effect.Effect<${EntityType} | null, DbError, typeof Db.Identifier> =>
  withDb(async (db) => {
    return db.query.${tableName}.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.userId, userId)),
    });
  });

export const findMany = (
  options?: { limit?: number; offset?: number },
): Effect.Effect<${EntityType}[], DbError, typeof Db.Identifier> =>
  withDb(async (db) => {
    return db.query.${tableName}.findMany({
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
    });
  });

export const create = (
  input: Create${EntityType}Input,
): Effect.Effect<${EntityType}, DbError, typeof Db.Identifier> =>
  withDb(async (db) => {
    const result = await db.insert(${tableName}).values(input).returning();
    return result[0]!;
  });

export const update = (
  id: string,
  input: Partial<${EntityType}>,
): Effect.Effect<${EntityType} | null, DbError, typeof Db.Identifier> =>
  withDb(async (db) => {
    const result = await db
      .update(${tableName})
      .set(input)
      .where(eq(${tableName}.id, id))
      .returning();
    return result[0] ?? null;
  });

export const remove = (
  id: string,
): Effect.Effect<boolean, DbError, typeof Db.Identifier> =>
  withDb(async (db) => {
    const result = await db
      .delete(${tableName})
      .where(eq(${tableName}.id, id))
      .returning({ id: ${tableName}.id });
    return result.length > 0;
  });
```

## Steps

1. Parse arguments
2. Infer entity type from repo name (e.g., Players → Player)
3. Generate the repository with CRUD operations
4. Write to `{package-path}/src/repos/{repo-name}-repo.ts`
5. Create `{package-path}/src/repos/index.ts` if it doesn't exist
6. Add export to repos index

## After Generation

Show the user:
1. The generated code
2. How to import it: `import * as ${RepoName}Repo from './repos/${repo-name}-repo';`
3. Example usage in a use case
4. Reminder to add types to `types.ts`
