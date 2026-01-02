# Project Structure

This document defines the feature-based organization pattern for the Content Studio frontend.

## Overview

Code is organized by **feature domain**, not by file type. Each feature contains all its components, hooks, and utilities co-located together.

**Key Principles:**

1. Features are self-contained modules
2. Shared code lives in `/shared/`
3. Routes remain in `/routes/` (TanStack Router requirement)
4. File naming matches backend conventions (kebab-case)

## Directory Layout

```
apps/web/src/
├── features/                    # Feature modules
│   ├── podcasts/
│   │   ├── components/          # Container + Presenter components
│   │   │   ├── index.ts
│   │   │   ├── podcast-list-container.tsx
│   │   │   ├── podcast-list.tsx
│   │   │   ├── podcast-detail-container.tsx
│   │   │   ├── podcast-detail.tsx
│   │   │   └── podcast-card.tsx
│   │   ├── hooks/               # Feature-specific hooks
│   │   │   ├── index.ts
│   │   │   ├── use-podcast.ts
│   │   │   ├── use-podcast-list.ts
│   │   │   ├── use-podcast-settings.ts
│   │   │   └── use-optimistic-generation.ts
│   │   └── index.ts             # Public exports
│   │
│   └── documents/
│       ├── components/
│       ├── hooks/
│       └── index.ts
│
├── shared/                      # Cross-cutting code
│   ├── components/              # Shared UI components
│   │   ├── index.ts
│   │   ├── confirmation-dialog.tsx
│   │   ├── error-fallback.tsx
│   │   └── page-header.tsx
│   ├── hooks/                   # Shared hooks
│   │   ├── index.ts
│   │   ├── use-sse.ts
│   │   └── use-optimistic-mutation.ts
│   └── lib/                     # Utilities
│       ├── errors.ts
│       └── formatters.ts
│
├── routes/                      # TanStack Router routes
│   ├── _protected/
│   │   ├── podcasts/
│   │   │   ├── index.tsx        # /podcasts list route
│   │   │   └── $podcastId.tsx   # /podcasts/:id detail route
│   │   └── documents/
│   │       └── ...
│   ├── _public/
│   │   └── login.tsx
│   ├── __root.tsx
│   └── index.tsx
│
├── clients/                     # External clients
│   ├── api-client.ts
│   ├── auth-client.ts
│   └── query-client.ts
│
├── providers/                   # React context providers
│   ├── sse-provider.tsx
│   └── theme-provider.tsx
│
└── main.tsx
```

## File Naming Conventions

Match backend conventions for consistency:

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `podcast-detail.tsx` |
| Hooks | kebab-case with `use-` prefix | `use-podcast-settings.ts` |
| Utilities | kebab-case | `format-duration.ts` |
| Types | kebab-case | `podcast-types.ts` |
| Index files | `index.ts` | `index.ts` |

## Feature Module Structure

### Standard Feature Template

```
features/{domain}/
├── components/
│   ├── index.ts                      # Export all components
│   ├── {domain}-list-container.tsx   # Container: data fetching
│   ├── {domain}-list.tsx             # Presenter: pure UI
│   ├── {domain}-detail-container.tsx
│   ├── {domain}-detail.tsx
│   └── {domain}-card.tsx
├── hooks/
│   ├── index.ts                      # Export all hooks
│   ├── use-{domain}.ts               # Single item query
│   ├── use-{domain}-list.ts          # List query
│   └── use-optimistic-{action}.ts    # Optimistic mutations
└── index.ts                          # Public API
```

### Index File Pattern

Each directory exports via `index.ts`:

```typescript
// features/podcasts/components/index.ts
export { PodcastListContainer } from './podcast-list-container';
export { PodcastList } from './podcast-list';
export { PodcastDetailContainer } from './podcast-detail-container';
export { PodcastDetail } from './podcast-detail';
export { PodcastCard } from './podcast-card';
```

```typescript
// features/podcasts/hooks/index.ts
export { usePodcast } from './use-podcast';
export { usePodcastList } from './use-podcast-list';
export { usePodcastSettings } from './use-podcast-settings';
export { useOptimisticGeneration } from './use-optimistic-generation';

// Re-export types
export type { UsePodcastSettingsReturn } from './use-podcast-settings';
```

```typescript
// features/podcasts/index.ts
export * from './components';
export * from './hooks';
```

### Importing from Features

```typescript
// From within the app
import { PodcastListContainer, usePodcastSettings } from '@/features/podcasts';

// From within the same feature
import { PodcastCard } from '../podcast-card';
import { usePodcast } from '../../hooks';
```

## When to Use `/shared/` vs Feature-Specific

### Put in `/shared/` when:

- Used by 2+ features
- Truly generic (no domain knowledge)
- Part of the design system

**Examples:**
- `confirmation-dialog.tsx` - generic confirmation UI
- `use-sse.ts` - app-wide SSE connection
- `errors.ts` - error formatting utilities

### Keep in feature when:

- Only used by one feature
- Contains domain-specific logic
- Might be generalized later (wait until needed)

**Examples:**
- `podcast-card.tsx` - podcast-specific UI
- `use-podcast-settings.ts` - podcast state management
- `use-optimistic-generation.ts` - podcast mutation

## Route Files

Route files act as **entry points** that compose feature components:

```typescript
// routes/_protected/podcasts/$podcastId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { PodcastDetailContainer } from '@/features/podcasts';
import { PodcastSkeleton } from '@/shared/components';
import { queryClient } from '@/clients/query-client';
import { apiClient } from '@/clients/api-client';

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  // Prefetch data
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastPage,
});

function PodcastPage() {
  return (
    <Suspense fallback={<PodcastSkeleton />}>
      <PodcastDetailContainer />
    </Suspense>
  );
}
```

**Route files should:**
- Import from features, not define components inline
- Set up Suspense boundaries
- Configure loaders for prefetching
- Be thin orchestration layers

## Anti-Patterns

### Circular Dependencies

```typescript
// WRONG - features importing from each other
// features/podcasts/components/podcast-detail.tsx
import { DocumentList } from '@/features/documents';  // Creates coupling!

// CORRECT - use shared or pass as prop
// features/podcasts/components/podcast-detail.tsx
interface PodcastDetailProps {
  documents: Document[];  // Passed from container
}
```

### Wrong Placement

```typescript
// WRONG - feature-specific code in shared
// shared/components/podcast-status-badge.tsx  // Too specific!

// CORRECT - keep in feature
// features/podcasts/components/podcast-status-badge.tsx
```

### Premature Extraction

```typescript
// WRONG - extracting before needed
// shared/hooks/use-entity-list.ts  // Only used by podcasts!

// CORRECT - extract when 2+ features need it
// features/podcasts/hooks/use-podcast-list.ts  // Keep here until needed elsewhere
```

### Barrel Export Everything

```typescript
// WRONG - exporting internal components
// features/podcasts/index.ts
export * from './components';  // Exports internal helpers too!

// CORRECT - explicit public API
// features/podcasts/index.ts
export {
  PodcastListContainer,
  PodcastDetailContainer,
} from './components';
export {
  usePodcast,
  usePodcastList,
} from './hooks';
```

### Route-Component Coupling

```typescript
// WRONG - route params accessed deep in tree
// features/podcasts/components/script-editor.tsx
const { podcastId } = useParams();  // Hidden dependency!

// CORRECT - pass from container
// features/podcasts/components/script-editor.tsx
interface ScriptEditorProps {
  podcastId: string;  // Explicit prop
}
```

## Migration from Current Structure

When touching existing code, migrate incrementally:

1. Create feature directory if it doesn't exist
2. Move related files into feature
3. Update imports in route files
4. Update barrel exports

**Don't:** Migrate everything at once. Migrate as you work on features.
