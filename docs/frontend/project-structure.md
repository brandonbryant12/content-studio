# Project Structure

## Golden Principles

1. Feature-based: `features/{domain}/{components,hooks}/` <!-- enforced-by: manual-review -->
2. Shared only when 2+ features need it <!-- enforced-by: manual-review -->
3. No circular dependencies between features <!-- enforced-by: eslint -->

## Directory Tree

```
apps/web/src/
  clients/                          # API client, query client singletons
    apiClient.ts
    queryClient.ts
  features/                         # Feature modules (domain-based)
    documents/
      components/
        document-detail-container.tsx
        document-detail.tsx
        document-list-container.tsx
        document-list.tsx
      hooks/
        use-document.ts
        use-document-list.ts
        use-document-actions.ts
        index.ts                    # Public API exports
      lib/                          # Feature-specific utilities
        format.ts
      __tests__/
        document-list.test.tsx
        handlers.ts                 # MSW handlers for this feature
    podcasts/
      components/
      hooks/
      lib/
      __tests__/
    voiceovers/
      components/
      hooks/
      __tests__/
    personas/
      components/
      hooks/
      __tests__/
    infographics/
      components/
      hooks/
      __tests__/
  routes/                           # TanStack Router file-based routes
    _protected/                     # Auth-required routes
      podcasts/
        $podcastId.tsx              # Route: loader + SuspenseBoundary + Container
        index.tsx
  shared/                           # Cross-feature utilities (2+ consumers)
    components/
      suspense-boundary.tsx
      error-boundary.tsx
    hooks/
      use-optimistic-mutation.ts
      use-sse.ts
      sse-handlers.ts
    lib/
      errors.ts
  test-utils/                       # Test infrastructure
    index.tsx                       # renderWithQuery, re-exports
    handlers.ts                     # Shared MSW handlers
    server.ts                       # MSW server setup
```

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | kebab-case | `podcast-detail-container.tsx` |
| Hooks | `use-{name}.ts` | `use-podcast-actions.ts` |
| Utilities | kebab-case | `format.ts`, `errors.ts` |
| Tests | `{name}.test.tsx` | `document-list.test.tsx` |
| MSW handlers | `handlers.ts` | `__tests__/handlers.ts` |

## Module Boundaries

| Rule | Detail |
|------|--------|
| Feature imports | Only via `index.ts` public API |
| Cross-feature | Features never import from each other directly |
| Shared promotion | Move to `shared/` when 2+ features need it |
| Route files | Thin: import Container, wrap in SuspenseBoundary |
| Index exports | Only public API -- no internal implementation |

## Import Aliases

```tsx
import { PodcastDetailContainer } from '@/features/podcasts/components/podcast-detail-container';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import { apiClient } from '@/clients/apiClient';
```

`@/` maps to `apps/web/src/`.
