# Task 15: Feature Hooks - List Select Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/js-cache-function-results.md`

## Context

The `select` functions in list hooks create new Date objects for every comparison during sorting:

```typescript
// Current implementation
select: (data) => {
  const sorted = [...data].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime(); // NEW Date every comparison!
    const dateB = new Date(b.createdAt).getTime(); // NEW Date every comparison!
    return orderBy === 'desc' ? dateB - dateA : dateA - dateB;
  });
  return limit ? sorted.slice(0, limit) : sorted;
},
```

For a list of 100 items, this creates ~200 Date objects per sort (O(n log n) comparisons).

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/podcasts/hooks/use-podcast-list.ts` | 73-81 | Date objects in select |
| `features/voiceovers/hooks/use-voiceover-list.ts` | 73-81 | Same pattern |
| `features/documents/hooks/use-document-list.ts` | 78-85 | Same pattern |

## Implementation Options

### Option A: String Comparison (Recommended)

ISO 8601 dates are lexicographically sortable:

```typescript
select: (data) => {
  const sorted = [...data].sort((a, b) => {
    // ISO dates sort correctly as strings
    return orderBy === 'desc'
      ? b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt);
  });
  return limit ? sorted.slice(0, limit) : sorted;
},
```

### Option B: Cache Date Objects

If string comparison doesn't work for some edge cases:

```typescript
select: (data) => {
  // Pre-compute timestamps once
  const withTimestamps = data.map(item => ({
    item,
    timestamp: new Date(item.createdAt).getTime(),
  }));

  withTimestamps.sort((a, b) =>
    orderBy === 'desc'
      ? b.timestamp - a.timestamp
      : a.timestamp - b.timestamp
  );

  const sorted = withTimestamps.map(({ item }) => item);
  return limit ? sorted.slice(0, limit) : sorted;
},
```

### Option C: Memoize Select Function

```typescript
const selectFn = useMemo(
  () => (data: PodcastListItem[]) => {
    const sorted = [...data].sort((a, b) =>
      orderBy === 'desc'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt)
    );
    return limit ? sorted.slice(0, limit) : sorted;
  },
  [orderBy, limit]
);

return useQuery({
  queryKey: [..., { orderBy, limit }],
  select: selectFn,
});
```

**Recommendation:** Option A (string comparison) is simplest and most efficient. ISO dates like `2024-01-15T10:00:00Z` sort correctly as strings.

## Apply to All Three Hooks

1. `use-podcast-list.ts`
2. `use-voiceover-list.ts`
3. `use-document-list.ts`

## Implementation Notes

### Changes Made

Used Option A (string comparison) for all three hooks:

1. **use-podcast-list.ts**: Replaced `new Date().getTime()` comparisons with `localeCompare()`
2. **use-voiceover-list.ts**: Same change
3. **use-document-list.ts**: Same change

### Result

ISO 8601 dates (e.g., `2024-01-15T10:00:00Z`) are lexicographically sortable, so string comparison produces correct results without creating Date objects. This eliminates ~200 Date object creations per sort of 100 items.

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [x] No new Date() calls in select functions (uses localeCompare)
- [x] Sorting still works correctly (ISO 8601 is lexicographically sortable)
