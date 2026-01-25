# Task 05: Podcasts Feature - Document Manager Split & Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`
- [ ] `standards/frontend/components.md` - Container/Presenter pattern

## Context

DocumentManager is 413 lines managing multiple concerns:
- Dialog open/close state
- Tab switching (existing/upload)
- File upload with drag-and-drop
- Document selection
- Search filtering

This violates single-responsibility and makes memoization difficult.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/podcasts/components/workbench/document-manager.tsx` | 38-451 | Too large, multiple concerns |

## Implementation Plan

### 1. Split into Sub-Components

```
document-manager.tsx (orchestrator, ~80 lines)
├── document-selector.tsx (existing docs tab, ~150 lines)
└── document-uploader.tsx (upload tab, ~150 lines)
```

### 2. Component Structure

```typescript
// document-manager.tsx - Orchestrator
export function DocumentManager({
  documents,
  onAddDocuments,
  onRemoveDocument,
  disabled,
}: DocumentManagerProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('existing');

  return (
    <BaseDialog ...>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>...</TabsList>
        <TabsContent value="existing">
          <DocumentSelector
            documents={documents}
            onAdd={onAddDocuments}
            onRemove={onRemoveDocument}
          />
        </TabsContent>
        <TabsContent value="upload">
          <Suspense fallback={<Spinner />}>
            <DocumentUploader onUpload={handleUpload} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </BaseDialog>
  );
}
```

### 3. Dynamic Import for Uploader

```typescript
// document-manager.tsx
const DocumentUploader = lazy(() => import('./document-uploader'));
```

The uploader is only needed when user switches to upload tab.

### 4. Memoize Sub-Components

```typescript
// document-selector.tsx
export const DocumentSelector = memo(function DocumentSelector({
  documents,
  selectedIds,
  onToggle,
  onRemove,
}: DocumentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = useMemo(() =>
    documents.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [documents, searchQuery]
  );

  // ... render
});
```

### 5. Convert Inline Handlers

Current inline handlers to convert:
- Line 249: `onClick={() => setActiveTab('existing')}`
- Line 256: `onClick={() => setActiveTab('upload')}`
- Line 341: `onClick={() => toggleDocument(doc.id)}`
- Lines 368-370: Upload file handlers
- Lines 422-433: File removal handlers

## Test Requirements

Add tests for:
1. DocumentSelector renders and filters correctly
2. DocumentUploader handles file selection
3. Dynamic import works (upload tab lazy loads)

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web test` passes
- [ ] DocumentManager reduced to <100 lines
- [ ] DocumentSelector is memoized
- [ ] DocumentUploader is dynamically imported
- [ ] No inline arrow functions in event handlers
