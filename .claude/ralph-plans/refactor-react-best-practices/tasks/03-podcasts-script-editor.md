# Task 03: Podcasts Feature - Script Editor Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md`

## Context

The ScriptEditor component has multiple inline arrow functions passed to SegmentItem props, which creates new function references on every render. This defeats memoization even though SegmentItem might be memoized.

**Current Issues (script-editor.tsx lines 136-143):**
```typescript
<SegmentItem
  onStartEdit={() => handleStartEdit(segment.index)}        // NEW fn every render
  onSaveEdit={(data) => handleSaveEdit(segment.index, data)} // NEW fn every render
  onNavigate={(direction) => handleNavigate(segment.index, direction)} // NEW fn
  onRemove={() => onRemoveSegment(segment.index)}           // NEW fn every render
  onAddAfter={() => setAddAfterIndex(segment.index)}        // NEW fn every render
/>
```

## Key Files

| File | Issue |
|------|-------|
| `features/podcasts/components/workbench/script-editor.tsx` | Multiple inline callbacks |
| `features/podcasts/components/workbench/segment-item.tsx` | Receives unstable callbacks |

## Implementation Strategy

### Option A: Pass segment.index to SegmentItem, handle callbacks internally

Change SegmentItem interface to receive segment index and stable callbacks:

```typescript
// script-editor.tsx
<SegmentItem
  segment={segment}
  segmentIndex={segment.index}
  onStartEdit={handleStartEdit}      // Stable reference
  onSaveEdit={handleSaveEdit}        // Stable reference
  onNavigate={handleNavigate}        // Stable reference
  onRemove={onRemoveSegment}         // Stable reference
  onAddAfter={handleAddAfter}        // Stable reference
/>

// segment-item.tsx - call with index internally
const handleClick = useCallback(() => {
  onStartEdit(segmentIndex);
}, [onStartEdit, segmentIndex]);
```

### Option B: Memoize callbacks with segment.index in dependency

Create stable callbacks per segment using a factory pattern:

```typescript
// Create stable callback references
const getSegmentCallbacks = useCallback((index: number) => ({
  onStartEdit: () => handleStartEdit(index),
  onSaveEdit: (data: SegmentData) => handleSaveEdit(index, data),
  // ...
}), [handleStartEdit, handleSaveEdit, ...]);
```

**Recommendation:** Option A is cleaner and follows the pattern already used for list items.

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] No inline arrow functions in SegmentItem props
- [ ] SegmentItem properly memoized with React.memo
- [ ] Callbacks are stable (verified with test or React DevTools)
