# Database Schema Pattern

## Goal

Define consistent, safe schema evolution rules for `@repo/db` so API/use-case patterns stay predictable under change.

## Canonical Locations

```text
packages/db/src/schemas/*.ts     # Drizzle schema + enums + relations
packages/db/drizzle/             # generated SQL + metadata
```

`packages/db/drizzle/0000_broad_schema_baseline.sql` is the bootstrap baseline.
After that baseline exists, new schema changes must land as new numbered
forward migrations plus matching snapshot/journal updates. Do not edit old
migration files to represent a new change.

## Golden Principles

1. Schema changes are backward-compatible first (expand then contract).
<!-- enforced-by: manual-review -->

2. Database constraints own invariants that must never be bypassed.
<!-- enforced-by: manual-review -->

3. Indexes are designed from repository query patterns, not added ad hoc.
<!-- enforced-by: manual-review -->

4. Ownership-scoped entities must include explicit ownership columns (`createdBy` / equivalent).
<!-- enforced-by: architecture -->

5. Enum values are stable contracts; changing/removing values requires a migration plan.
<!-- enforced-by: manual-review -->

## Required Modeling Rules

| Concern | Required Rule |
|---|---|
| Primary keys | Use stable IDs (`text`/UUID style), never mutable business fields |
| Timestamps | Include `createdAt` and `updatedAt` on mutable entities |
| Ownership | Owner-only resources include owner column used by repo predicates |
| Nullability | Use nullable only when semantically unknown/optional |
| Foreign keys | Add FK constraints for parent-child integrity unless documented exception |
| Enums | Define with `pgEnum` + companion const/type per enum pattern |

See [`docs/patterns/enum-constants.md`](./enum-constants.md) for enum companion rules.

## Index Strategy

Design indexes from repository access paths (`findByIdForUser`, list filters, queue claim flow).

1. Add index for every hot-path predicate used in `WHERE` + `ORDER BY`.
2. Prefer composite indexes that match predicate order.
3. Avoid speculative indexes with no query evidence.
4. Re-check index coverage when adding new repository list filters.

Example mapping:

| Query Pattern | Suggested Index |
|---|---|
| `WHERE id = ? AND createdBy = ?` | `(id, created_by)` or `(created_by, id)` based on dominant lookup |
| `WHERE status = 'pending' ORDER BY created_at` | `(status, created_at)` |
| `WHERE createdBy = ? ORDER BY created_at DESC` | `(created_by, created_at DESC)` |

## Migration Workflow

Use expand-contract for breaking changes:

1. Expand: add nullable column / new enum value / dual-write support.
2. Backfill: migrate existing rows safely.
3. Cutover: switch reads/writes to new shape.
4. Contract: remove deprecated column/value in a later release.

For non-breaking additive changes (new table/column with safe default), one-step migration is acceptable.

## Migration Artifact Rules

1. Change the schema in `packages/db/src/schemas/*.ts`.
2. Generate a new Drizzle migration under `packages/db/drizzle/`.
3. Commit the generated SQL, snapshot, and `_journal.json` updates together.
4. Apply the migration locally to verify it.

Required rule:

1. Post-bootstrap schema changes must create a new numbered migration file.
2. Do not edit `0000_broad_schema_baseline.sql` or an older snapshot to
   represent a new change unless you are intentionally resetting migration
   history before deployment and have explicitly decided to squash history.
3. `pnpm db:push` is for applying schema changes locally; it does not replace
   generating and committing migration artifacts.

Typical additive-change flow:

```bash
cd packages/db
DB_POSTGRES_URL=postgresql://... pnpm generate --name <change-name>
pnpm db:push
```

## Transaction and Data Movement Rules

1. Keep data migration logic deterministic and idempotent.
2. Never require downtime for normal schema evolution.
3. For large backfills, run chunked jobs (worker/ops script), not one giant transaction.
4. Keep migration steps compatible with currently deployed app code until cutover completes.

## Review Checklist

Before merge:

1. Schema file updated in `packages/db/src/schemas/`.
2. Query/index impact reviewed against affected repos.
3. Migration path documented (expand-contract or additive).
4. API/use-case contract impact captured in tests/spec updates.
5. A new forward migration file was generated and committed for every
   post-bootstrap schema change.
6. `pnpm db:push`/migration apply and relevant tests ran locally.

## Related Standards

- [`docs/patterns/repository.md`](./repository.md)
- [`docs/patterns/transaction-boundaries.md`](./transaction-boundaries.md)
- [`docs/patterns/job-queue.md`](./job-queue.md)
