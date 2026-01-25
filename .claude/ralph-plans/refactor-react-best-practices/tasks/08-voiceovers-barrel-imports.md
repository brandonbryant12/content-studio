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

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` passes
- [ ] No remaining barrel imports in voiceovers feature
