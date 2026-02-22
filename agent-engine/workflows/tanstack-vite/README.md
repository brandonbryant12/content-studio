# TanStack + Vite Guardrails

- Memory key: `TanStack + Vite`
- Primary skill: [`tanstack-vite`](../../../.agents/skills/tanstack-vite/SKILL.md)

## What It Does

Protects `apps/web` data loading, caching, routing, forms, and build behavior with TanStack Query/Router/Form and Vite-specific rules.

## Trigger Skills

- `tanstack-vite` (primary)
- Common companion: `feature-delivery`

## Automation Entry Points

- No dedicated automation lane owns this workflow.
- It is applied inside code-writing lanes when `apps/web` data/routing/forms/build surfaces are touched.

## How It Works

1. Enforce loader/query boundaries (`ensureQueryData`, `useSuspenseQuery` for required data).
2. Use `queryOptions().queryKey`-derived keys and explicit retry semantics.
3. Keep search params typed and loader dependencies explicit.
4. Apply composition-first React patterns and accessibility baseline.
5. Check web build output for chunk/bundle regressions.

## Outputs

- Frontend changes aligned with TanStack/Vite guardrails.
- `apps/web` validation evidence and memory entry with workflow `TanStack + Vite`.
