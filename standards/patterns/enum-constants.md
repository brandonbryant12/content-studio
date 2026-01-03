# Enum Constants Pattern

This document describes the standard pattern for defining and using enum-like constants across the codebase.

## Overview

Instead of using magic strings for status values and other enumerated types, we use a **companion object pattern** where both a TypeScript type and a runtime constant object share the same name.

## Pattern Structure

### 1. Define in `@repo/db/schema`

All enum constants are defined in `packages/db/src/schemas/{entity}.ts`:

```typescript
// 1. Database enum (Drizzle)
export const versionStatusEnum = pgEnum('version_status', [
  'drafting',
  'generating_script',
  'script_ready',
  'generating_audio',
  'ready',
  'failed',
]);

// 2. Runtime constant object (companion object)
export const VersionStatus = {
  DRAFTING: 'drafting',
  GENERATING_SCRIPT: 'generating_script',
  SCRIPT_READY: 'script_ready',
  GENERATING_AUDIO: 'generating_audio',
  READY: 'ready',
  FAILED: 'failed',
} as const;

// 3. TypeScript type (inferred from database)
export type VersionStatus = Podcast['status'];
```

### 2. Export via `@repo/db/schema`

The constants are automatically exported through the schema barrel file:

```typescript
// packages/db/src/schema.ts
export * from './schemas/podcasts';
```

### 3. Import and Use in Frontend

```typescript
// Import both the const and the type
import { VersionStatus, type VersionStatus as VersionStatusType } from '@repo/db/schema';

// Use const for comparisons
if (podcast.status === VersionStatus.READY) {
  // ...
}

// Use in switch statements
switch (status) {
  case VersionStatus.DRAFTING:
    return <DraftView />;
  case VersionStatus.READY:
    return <ReadyView />;
}

// Use type for function parameters
function isReady(status: VersionStatusType): boolean {
  return status === VersionStatus.READY;
}
```

## Benefits

1. **Type Safety**: TypeScript ensures only valid values are used
2. **Autocomplete**: IDE provides suggestions for available values
3. **Refactoring**: Rename in one place, changes propagate everywhere
4. **No Magic Strings**: Eliminates typos and inconsistencies
5. **Single Source of Truth**: Defined once in `@repo/db/schema`

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| pgEnum variable | `camelCaseEnum` | `versionStatusEnum` |
| Const object | `PascalCase` | `VersionStatus` |
| Const keys | `SCREAMING_SNAKE_CASE` | `GENERATING_SCRIPT` |
| Type | `PascalCase` (same as const) | `VersionStatus` |

## Re-exporting for Feature Modules

For convenience, feature modules may re-export constants from a local file:

```typescript
// features/podcasts/lib/status.ts
import {
  VersionStatus,
  type VersionStatus as VersionStatusType,
} from '@repo/db/schema';

// Re-export for local use
export { VersionStatus };
export type { VersionStatusType };

// Add feature-specific config using the constants
export const VERSION_STATUS_CONFIG: Record<VersionStatusType, StatusConfig> = {
  [VersionStatus.DRAFTING]: { label: 'Drafting', ... },
  [VersionStatus.READY]: { label: 'Ready', ... },
};
```

## Adding New Enum Constants

1. Add the pgEnum in `packages/db/src/schemas/{entity}.ts`
2. Add the companion const object with `as const` assertion
3. Ensure the type is exported (usually inferred from the table)
4. Use the constants in all code instead of string literals
