---
name: tanstack-vite
description: TanStack Query/Router/Form + Vite guardrails for apps/web. Use when implementing or reviewing frontend data loading, routing, forms, caching, or build/performance behavior.
---

# Content Studio TanStack + Vite

Apply this whenever `apps/web` changes touch data loading, route behavior, forms, or build output.

## Query + Router Standards

- Use route loaders + `queryClient.ensureQueryData(...)` for required route data.
- Use `useSuspenseQuery` for required UI data; `useQuery` for optional/conditional data.
- Derive query keys from `apiClient.<domain>.<route>.queryOptions(...).queryKey`.
- Never hardcode invalidate keys.
- Set router `defaultPreload: 'intent'` and `defaultPreloadStaleTime: 0` when React Query owns freshness.
- For search-driven routes:
  - validate search params (`validateSearch`)
  - include search inputs in `loaderDeps`

## Query Behavior Defaults

- Keep non-zero `staleTime` and `gcTime` defaults.
- Use selective retry:
  - no retries for `*_NOT_FOUND`
  - bounded retries for transient failures
- Prefer explicit `enabled` or `skipToken` for conditional queries.
- Prevent waterfalls by parallelizing independent data work (`Promise.all`) at loader/use-case boundaries.

## Forms

- Use TanStack Form + Effect `Schema.standardSchemaV1`.
- Keep mutation logic in container hooks/components.
- Keep form components UI-focused with clear field error display.

## Frontend Design Standards

- Decide visual direction before implementation; avoid default/boilerplate-looking UI.
- Build explicit state design for loading/empty/error/success.
- Accessibility minimum:
  - keyboard navigation and visible focus
  - semantic controls and labels
  - color contrast that remains legible
- Keep motion meaningful and bounded; respect reduced-motion expectations.

## React Composition + Performance

- Prefer composition over boolean mode props.
- Use compound components/context for complex shared behavior.
- Keep provider interfaces stable and implementation details encapsulated.
- Avoid effect-driven derived state; derive during render when possible.
- Use `startTransition` for non-urgent UI updates.
- Favor targeted imports over broad barrels on hot paths.

## Vite Standards

- Prefer TanStack Router auto code splitting over aggressive per-package `manualChunks`.
- Keep `envPrefix: 'PUBLIC_'` and validate env shapes.
- Watch build output for:
  - too many tiny chunks
  - unexpectedly large route bundles
  - duplicated heavy libraries
- Use static imports as default; avoid dynamic import sprawl.

## Review Checklist

- Data required at route boundary is preloaded in loader.
- No hardcoded query keys for invalidation.
- Retry semantics are intentional.
- Search params are typed and drive loader dependencies.
- Component APIs remain composition-friendly (no boolean-prop sprawl).
- UI states and accessibility baseline are explicit.
- Build output is sane after change (`pnpm --filter web build`).

## Memory + Compounding

After frontend-impacting merges, record one event with workflow key `TanStack + Vite` using `node agentic-harness-framework/scripts/workflow-memory/add-entry.mjs` per `docs/workflow-memory/README.md`. Include the event `id` in output.
