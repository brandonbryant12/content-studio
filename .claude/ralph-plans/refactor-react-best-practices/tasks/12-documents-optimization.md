# Task 12: Documents Feature - Barrel Import & List Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`

## Context

Documents feature is simpler but has the same patterns:
1. Barrel imports in index files
2. List filtering not memoized
3. Inline event handlers

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/documents/hooks/index.ts` | - | Barrel exports |
| `features/documents/components/index.ts` | - | Barrel exports |
| `features/documents/components/document-list.tsx` | 65-70 | Filter not memoized |
| `features/documents/components/document-list.tsx` | 98 | Inline onChange |

## Implementation

### 1. Remove Barrel Exports

```typescript
// BEFORE - features/documents/index.ts
export * from './hooks';
export * from './components';

// AFTER - Remove file or make specific exports only
```

### 2. Memoize Filter

```typescript
// document-list.tsx
const filteredDocuments = useMemo(
  () => documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  ),
  [documents, searchQuery]
);
```

### 3. Convert onChange to useCallback

```typescript
const handleSearchChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value),
  [onSearch]
);
```

## Implementation Notes

### Changes Made

1. **Barrel exports in `features/documents/index.ts`**: Converted wildcard exports (`export * from`) to named exports from specific files. Routes already used direct imports.

2. **`features/documents/hooks/index.ts`**: Already used named exports - no changes needed.

3. **`features/documents/components/index.ts`**: Already used named exports - no changes needed.

4. **`features/documents/components/document-list.tsx`**:
   - Added `useMemo` import
   - Wrapped `filteredDocuments` in `useMemo` with deps `[documents, searchQuery]`
   - Added `useCallback` import
   - Converted inline `onChange={(e) => onSearch(e.target.value)}` to `handleSearchChange` callback with deps `[onSearch]`

### Pre-existing Test Issues

Test failures are pre-existing issues unrelated to these changes:
- Tests use `'Search documents...'` (three periods) but component uses `'Search documents…'` (unicode ellipsis)
- Similar issue with podcast tests using `'Search podcasts...'`
- voiceover-detail tests have mock configuration issues

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [x] Barrel exports removed or made specific (index.ts now uses named exports from specific files)
- [x] filteredDocuments uses useMemo
- [x] onSearch uses useCallback (handleSearchChange)
