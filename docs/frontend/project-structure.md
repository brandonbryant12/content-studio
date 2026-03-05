# Project Structure

## Golden Principles

1. Feature-based: `features/{domain}/{components,hooks,lib}` <!-- enforced-by: manual-review -->
2. Shared code only after two or more features need it <!-- enforced-by: manual-review -->
3. Route files stay thin and delegate to feature containers <!-- enforced-by: manual-review -->
4. No circular dependencies between features <!-- enforced-by: eslint -->

## Directory Tree

```
apps/web/src/
  clients/                          # Typed API client, auth client, query client
    apiClient.ts
    authClient.ts
    queryClient.ts
  providers/
    sse-provider.tsx
  features/                         # Domain-based feature modules
    admin/
    dashboard/
    infographics/
    personas/
    podcasts/
    sources/
    voiceovers/
  routes/                           # TanStack Router file-based routes
    __root.tsx
    index.tsx
    _public/
      layout.tsx
      login.tsx
      register.tsx
    _protected/
      layout.tsx
      dashboard.tsx
      admin/
        activity.tsx
      sources/
        $sourceId.tsx
        index.tsx
      podcasts/
        $podcastId.tsx
        index.tsx
      voiceovers/
        $voiceoverId.tsx
        index.tsx
      personas/
        $personaId.tsx
        index.tsx
      infographics/
        $infographicId.tsx
        index.tsx
    -components/                    # Route-only layout and shared form helpers
  shared/                           # Cross-feature UI and behaviors
    components/
      approval/
      base-dialog/
      bulk-action-bar/
      confirmation-dialog/
      error-boundary/
      source-manager/
      suspense-boundary.tsx
      query-error-fallback.tsx
    hooks/
      use-audio-player.ts
      use-bulk-delete.ts
      use-optimistic-mutation.ts
      use-session-guard.ts
      use-sse.ts
    lib/
      auth-errors.ts
      auth-token.ts
      errors.ts
      storage-url.ts
  test-utils/                       # Shared render helpers and MSW wiring
    index.tsx
    handlers.ts
    server.ts
```

## Route To Feature Mapping

| Route area | Main feature module | Notes |
|------|--------|-------|
| `_public/*` | Auth entry pages | Login and registration only |
| `_protected/dashboard` | `features/dashboard` | Post-login landing page |
| `_protected/admin/activity` | `features/admin` | Admin activity and stats |
| `_protected/sources/*` | `features/sources` | Source ingestion, editing, research |
| `_protected/podcasts/*` | `features/podcasts` | Setup wizard and generation workbench |
| `_protected/voiceovers/*` | `features/voiceovers` | Script, voice, and playback workbench |
| `_protected/personas/*` | `features/personas` | Persona CRUD and chat |
| `_protected/infographics/*` | `features/infographics` | Prompting, versions, export |

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | kebab-case | `podcast-detail-container.tsx` |
| Hooks | `use-{name}.ts` | `use-podcast-actions.ts` |
| Utilities | kebab-case | `format.ts`, `errors.ts` |
| Tests | `{name}.test.tsx` | `source-list.test.tsx` |
| MSW handlers | `handlers.ts` | `__tests__/handlers.ts` |

## Module Boundaries

| Rule | Detail |
|------|--------|
| Feature imports | Prefer feature public exports when present; otherwise import within the same feature subtree only |
| Cross-feature access | Features do not import from each other directly unless the dependency is intentionally promoted to `shared/` |
| Shared promotion | Move code to `shared/` once it is reused across features |
| Route files | Own route config, auth guard behavior, and page composition only |
| Clients | `clients/` owns API transport and auth refresh behavior; feature code should not reimplement fetch logic |

## Dependency Flow

The intended frontend flow is:

`route -> feature container -> feature hooks -> api client / shared hooks -> typed server contract`

Use `shared/` for infrastructure-like concerns such as SSE subscriptions, optimistic mutation helpers, bulk actions, and shared dialogs.

## Import Aliases

```tsx
import { PodcastDetailContainer } from '@/features/podcasts/components/podcast-detail-container';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import { apiClient } from '@/clients/apiClient';
```

`@/` maps to `apps/web/src/`.

## Chunk Splitting Policy

- Prefer TanStack Router automatic route-level code splitting for feature and route code.
- Edit `apps/web/vite.config.ts` `manualChunks` only when a stable, cross-route vendor grouping prevents measurable regressions.
- Do not add per-package or per-file `manualChunks` branches for route or application code.
- Current Vite bundler output does not honor Rollup `output.onlyExplicitManualChunks`; use the constrained coarse-bucket `manualChunks` policy plus build guardrail instead.
- Validate chunk health with `pnpm --filter web build` (includes `build:chunk-report` guardrail for JS chunk count and largest JS chunk size).
