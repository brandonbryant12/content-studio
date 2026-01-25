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

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] Barrel exports removed or made specific
- [ ] filteredDocuments uses useMemo
- [ ] onSearch uses useCallback
