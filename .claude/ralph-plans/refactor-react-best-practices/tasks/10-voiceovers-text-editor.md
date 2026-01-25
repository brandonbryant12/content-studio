# Task 10: Voiceovers Feature - Text Editor Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/js-cache-property-access.md`

## Context

TextEditor's `CharacterCountRing` component recalculates circle math (circumference, strokeDashoffset) on every character change. These constants can be hoisted or memoized.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/voiceovers/components/workbench/text-editor.tsx` | 17-81 | Circle math recalculated |
| `features/voiceovers/components/workbench/text-editor.tsx` | 99 | Inline onChange |

## Implementation

### 1. Hoist Constants

```typescript
// BEFORE - Inside component
function CharacterCountRing({ count, max }: Props) {
  const percentage = Math.min((count / max) * 100, 100);
  const radius = 12;
  const circumference = 2 * Math.PI * radius;  // Recalculated every render!
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  // ...
}

// AFTER - Hoist static values outside
const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CharacterCountRing({ count, max }: Props) {
  const percentage = Math.min((count / max) * 100, 100);
  const strokeDashoffset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;
  // ...
}
```

### 2. Memoize CharacterCountRing

```typescript
const CharacterCountRing = memo(function CharacterCountRing({ count, max }: Props) {
  // Now only re-renders when count or max changes
});
```

### 3. Convert onChange to useCallback

```typescript
// BEFORE
<textarea onChange={(e) => onChange(e.target.value)} />

// AFTER
const handleChange = useCallback(
  (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
  [onChange]
);
// ...
<textarea onChange={handleChange} />
```

### 4. Also hoist MAX_CHARACTERS

Already defined at module level - verify it stays that way:
```typescript
const MAX_CHARACTERS = 5000; // Already hoisted - good!
```

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] RING_RADIUS and RING_CIRCUMFERENCE hoisted outside component
- [ ] CharacterCountRing memoized
- [ ] onChange uses useCallback
- [ ] MAX_CHARACTERS remains hoisted
