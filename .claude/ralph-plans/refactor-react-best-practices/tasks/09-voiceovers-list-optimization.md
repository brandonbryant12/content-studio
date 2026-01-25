# Task 09: Voiceovers Feature - List & Voice Selector Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`

## Context

Similar to podcasts, voiceovers has list components that need optimization:
1. `VoiceSelector` - renders multiple voice cards with onClick handlers
2. `CollaboratorRow` - not memoized
3. `filteredVoiceovers` - not memoized

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/voiceovers/components/workbench/voice-selector.tsx` | 29, 45 | Not memoized, inline onClick |
| `features/voiceovers/components/collaborators/collaborator-list.tsx` | 56 | CollaboratorRow not memoized |
| `features/voiceovers/components/voiceover-list.tsx` | 84-86 | filteredVoiceovers not memoized |

## Implementation

### 1. Memoize VoiceSelector

```typescript
// BEFORE
export function VoiceSelector({ ... }) {
  return (
    <div>
      {VOICES.map((v) => (
        <button onClick={() => onChange(v.id)}>...</button>
      ))}
    </div>
  );
}

// AFTER
export const VoiceSelector = memo(function VoiceSelector({ ... }) {
  const handleVoiceSelect = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const voiceId = e.currentTarget.dataset.voiceId;
    if (voiceId) onChange(voiceId);
  }, [onChange]);

  return (
    <div>
      {VOICES.map((v) => (
        <button data-voice-id={v.id} onClick={handleVoiceSelect}>...</button>
      ))}
    </div>
  );
});
```

### 2. Memoize CollaboratorRow

Same pattern as podcasts:
```typescript
const CollaboratorRow = memo(function CollaboratorRow({ ... }) {
  // ...
});
```

### 3. Memoize filteredVoiceovers

```typescript
const filteredVoiceovers = useMemo(
  () => voiceovers.filter((voiceover) =>
    voiceover.title.toLowerCase().includes(searchQuery.toLowerCase()),
  ),
  [voiceovers, searchQuery]
);
```

## Test Requirements

Add test for VoiceSelector stability:
```typescript
it('does not create new onClick handlers on re-render', () => {
  // Verify callback stability
});
```

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web test` passes
- [ ] VoiceSelector is memoized
- [ ] CollaboratorRow is memoized
- [ ] filteredVoiceovers uses useMemo
- [ ] No inline arrow functions in list rendering
