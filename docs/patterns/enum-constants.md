# Enum Constants Pattern

Use the **companion object pattern**: a `pgEnum`, a `const` object, and a `type` that share the same name.

## Pattern

```typescript
// packages/db/src/schemas/{entity}.ts

// 1. Database enum (Drizzle)
export const versionStatusEnum = pgEnum('version_status', [
  'drafting', 'generating_script', 'script_ready', 'generating_audio', 'ready', 'failed',
]);

// 2. Runtime constant object
export const VersionStatus = {
  DRAFTING: 'drafting',
  GENERATING_SCRIPT: 'generating_script',
  SCRIPT_READY: 'script_ready',
  GENERATING_AUDIO: 'generating_audio',
  READY: 'ready',
  FAILED: 'failed',
} as const;

// 3. TypeScript type (inferred from DB entity)
export type VersionStatus = Podcast['status'];
```

## Naming Conventions <!-- enforced-by: eslint -->

| Item | Convention | Example |
|---|---|---|
| `pgEnum` variable | `camelCaseEnum` | `versionStatusEnum` |
| Const object | `PascalCase` | `VersionStatus` |
| Const keys | `SCREAMING_SNAKE_CASE` | `GENERATING_SCRIPT` |
| Type | `PascalCase` (same as const) | `VersionStatus` |

## Usage <!-- enforced-by: types -->

```typescript
import { VersionStatus, type VersionStatus as VersionStatusType } from '@repo/db/schema';

// Comparisons -- always use the const, never string literals
if (podcast.status === VersionStatus.READY) { ... }

// Switch
switch (status) {
  case VersionStatus.DRAFTING: return <DraftView />;
  case VersionStatus.READY:    return <ReadyView />;
}

// Type annotations
function isReady(status: VersionStatusType): boolean {
  return status === VersionStatus.READY;
}
```

## Rules

1. **Single source of truth** -- define in `packages/db/src/schemas/{entity}.ts`, export via `@repo/db/schema` <!-- enforced-by: architecture -->
2. **No magic strings** -- always use the const object for comparisons <!-- enforced-by: eslint -->
3. **Feature modules may re-export** and add config (`VERSION_STATUS_CONFIG`) <!-- enforced-by: manual-review -->

## Adding a New Enum <!-- enforced-by: manual-review -->

1. Add `pgEnum` in schema file
2. Add companion `const` object with `as const`
3. Export the inferred type from the table entity
4. Run `pnpm db:push` for DB migration
