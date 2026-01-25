# Task 01: Podcasts Feature - Barrel Import Cleanup

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md`

## Context

Barrel imports (index.ts re-exports) prevent proper tree-shaking and can significantly increase bundle size. The podcasts feature currently uses extensive barrel exports with wildcards.

**Key Issue:** When `dashboard.tsx` imports `PodcastItem`, it transitively loads ALL workbench and setup components that aren't used on the dashboard.

## Key Files

### Files to Modify

| File | Action |
|------|--------|
| `features/podcasts/hooks/index.ts` | Replace `export *` with specific exports or remove entirely |
| `features/podcasts/components/index.ts` | Remove `export * from './workbench'` and `export * from './setup'` |
| `features/podcasts/index.ts` | Consider removing or making specific |
| `routes/_protected/dashboard.tsx` | Use direct imports |
| `routes/_protected/podcasts/index.tsx` | Use direct imports |
| `routes/_protected/podcasts/$podcastId.tsx` | Use direct imports |

### Current Barrel Structure (to eliminate)

```
features/podcasts/index.ts
├── export * from './hooks'          # 13+ hooks
├── export * from './components'     # All components including workbench
└── export * from './lib/status'

features/podcasts/components/index.ts
├── export * from './workbench'      # 13 components!
├── export * from './setup'          # 3 components
├── export { PodcastItem }
└── ... other exports
```

### Target Pattern

```typescript
// BEFORE (barrel import)
import { PodcastDetailContainer, usePodcast } from '@/features/podcasts';

// AFTER (direct imports)
import { PodcastDetailContainer } from '@/features/podcasts/components/podcast-detail-container';
import { usePodcast } from '@/features/podcasts/hooks/use-podcast';
```

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` passes
- [ ] No remaining barrel imports in podcasts feature (grep check)
