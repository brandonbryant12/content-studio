# Task 08: Voiceovers Feature - Barrel Import Cleanup

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md`

## Context

Same pattern as podcasts - voiceovers feature uses barrel exports that prevent proper tree-shaking.

## Key Files

| File | Action |
|------|--------|
| `features/voiceovers/hooks/index.ts` | Replace wildcard exports with specific or remove |
| `features/voiceovers/components/index.ts` | Remove wildcard exports |
| `features/voiceovers/index.ts` | Consider removing |
| `routes/_protected/voiceovers/index.tsx` | Use direct imports |
| `routes/_protected/voiceovers/$voiceoverId.tsx` | Use direct imports |
| `routes/_protected/dashboard.tsx` | Already may use direct imports |

## Target Pattern

```typescript
// BEFORE
import { VoiceoverDetailContainer, useVoiceover } from '@/features/voiceovers';

// AFTER
import { VoiceoverDetailContainer } from '@/features/voiceovers/components/voiceover-detail-container';
import { useVoiceover } from '@/features/voiceovers/hooks/use-voiceover';
```

## Implementation Notes

- Routes were already using direct imports (no changes needed)
- `voiceovers/index.ts` had wildcard `export * from './components'` and `export * from './hooks'` - replaced with specific exports
- `hooks/index.ts` and `components/index.ts` were already using specific exports (no wildcard re-exports)
- Fixed test file `__tests__/voiceover-detail.test.tsx` using barrel import `from '../hooks'` → direct imports
- Fixed `workbench/workbench-layout.tsx` using barrel import `from '../collaborators'` → direct imports

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web build` passes
- [x] No remaining `export * from` in voiceovers feature (verified with grep)
