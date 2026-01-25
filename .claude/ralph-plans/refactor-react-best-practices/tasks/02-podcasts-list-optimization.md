# Task 02: Podcasts Feature - List Components Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`

## Context

List components benefit significantly from memoization because they render multiple items. When a parent re-renders, all list items re-render unless properly memoized.

**Current Issues:**
1. `CollaboratorRow` in collaborator-list.tsx is not memoized despite being in a loop
2. `filteredPodcasts` in podcast-list.tsx is recalculated on every render
3. Inline arrow functions passed to list items

## Key Files

| File | Line(s) | Issue |
|------|---------|-------|
| `features/podcasts/components/collaborators/collaborator-list.tsx` | 56 | `CollaboratorRow` not memoized |
| `features/podcasts/components/podcast-list.tsx` | 84-86 | `filteredPodcasts` not memoized |
| `features/podcasts/components/podcast-list.tsx` | 98 | Inline onChange handler |

## Implementation

### 1. Memoize CollaboratorRow

```typescript
// BEFORE
function CollaboratorRow({ ... }: CollaboratorRowProps) {
  // ...
}

// AFTER
const CollaboratorRow = memo(function CollaboratorRow({ ... }: CollaboratorRowProps) {
  // ...
});
```

### 2. Memoize filteredPodcasts

```typescript
// BEFORE
const filteredPodcasts = podcasts.filter((podcast) =>
  podcast.title.toLowerCase().includes(searchQuery.toLowerCase()),
);

// AFTER
const filteredPodcasts = useMemo(
  () => podcasts.filter((podcast) =>
    podcast.title.toLowerCase().includes(searchQuery.toLowerCase()),
  ),
  [podcasts, searchQuery]
);
```

### 3. Convert inline handlers to useCallback

```typescript
// BEFORE
<Input onChange={(e) => onSearch(e.target.value)} />

// AFTER
const handleSearchChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value),
  [onSearch]
);
// ...
<Input onChange={handleSearchChange} />
```

## Test Requirements

Add test to `features/podcasts/__tests__/podcast-list.test.tsx`:

```typescript
it('does not re-render items when unrelated state changes', () => {
  const renderCount = { count: 0 };
  // Mock PodcastItem to track renders
  // Verify count stays stable when parent updates
});
```

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web test` passes
- [ ] CollaboratorRow is memoized
- [ ] filteredPodcasts uses useMemo
- [ ] No inline arrow functions in list rendering
