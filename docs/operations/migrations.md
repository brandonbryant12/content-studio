# Database Migrations

## Overview

Migrations are managed using Drizzle Kit with PostgreSQL.

## Running Migrations

```bash
# Apply pending migrations to the database
pnpm db:push

# Open Drizzle Studio for visual inspection
pnpm db:studio
```

## Creating Migrations

1. Modify schema files in `packages/db/src/schemas/`
2. Run migration generation (if using migration files)
3. Review generated SQL
4. Apply with `pnpm db:push`

## Schema Location

All schema definitions are in `packages/db/src/schemas/`:

- `auth.ts` - User, session, account, verification tables
- `documents.ts` - Document storage and metadata
- `podcasts.ts` - Podcast and script tables
- `projects.ts` - Project and project-document relations
- `jobs.ts` - Background job queue
- `storage.ts` - Binary blob storage

## Connection Configuration

Drizzle uses the `DB_POSTGRES_URL` environment variable.

For migrations (non-pooled connection):
```
postgresql://user:pass@host:5432/db
```

For runtime (pooled via Supabase):
```
postgresql://user:pass@host:6543/db
```

The config automatically converts port 6543 to 5432 for migrations.

## Rollback Strategy

Drizzle does not support automatic rollbacks. For rollbacks:

1. Create a new migration that reverses the changes
2. Or restore from database backup for critical failures

## Production Checklist

Before deploying schema changes:

- [ ] Test migration on staging database
- [ ] Backup production database
- [ ] Schedule maintenance window for destructive changes
- [ ] Have rollback migration ready
- [ ] Test application with new schema

## Breaking Changes

For breaking schema changes:

1. Add new column/table (nullable or with default)
2. Deploy application code that writes to both old and new
3. Migrate existing data
4. Deploy application code that reads from new only
5. Remove old column/table in separate migration
