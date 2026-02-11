---
paths:
  - "apps/web/**"
  - "packages/ui/**"
---

# Frontend Rules

## Performance
- **Every route MUST have a `loader`** that calls `queryClient.ensureQueryData(...)`. The router has `defaultPreload: 'intent'` configured — adding a loader enables instant navigation on hover/focus for free.
- **Lazy-load heavy third-party libraries** with `React.lazy()`. Syntax highlighters, DnD kits, rich editors, etc. should not be in the main bundle. Show a lightweight fallback while loading.
- **Use refs for high-frequency transient values** (e.g., audio `currentTime`). Only update state when the displayed value changes (e.g., once per second for time displays). Don't trigger 4 re-renders/second for a seconds counter.

## Accessibility
- **WCAG 2.1 Level A required.** See `standards/frontend/components.md` for full rules.
- Key: every icon button needs `aria-label`, every input needs a label, every page sets `document.title`.

## Destructive Actions
- **Every delete action MUST show a confirmation dialog.** Use the existing `ConfirmationDialog` component. Never execute destructive actions on a single click.
- **If a delete button has no handler, hide it.** Don't render non-functional interactive elements.

## Component Architecture
- **See `standards/frontend/components.md` and `standards/frontend/project-structure.md`** for full rules.
- Key: container/presenter split, max 300 lines, `useXxxActions` hooks for mutations, Radix UI primitives, `use()` not `useContext()`.

## File Conventions
- **kebab-case for all files** (`podcast-detail-container.tsx`, not `podcastDetailContainer.tsx`)
- Exception: client singletons (`authClient.ts`, `queryClient.ts`, `apiClient.ts`) and TanStack Router param files (`$podcastId.tsx`)
- Shared components: `shared/components/`
- Shared hooks: `shared/hooks/`
- Feature hooks: `features/xxx/hooks/`
