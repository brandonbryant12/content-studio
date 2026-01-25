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

### Changes Made (Option A implemented):

1. **segment-item.tsx**:
   - Added `React.memo()` wrapper to `SegmentItem` component
   - Added `segmentIndex` prop to receive the segment's index
   - Updated callback props to accept `segmentIndex` as first parameter
   - Added internal `useCallback` wrappers for all event handlers that call parent callbacks with segmentIndex
   - `handleRemove`, `handleAddAfter`, `handleContentClick`, `handleSave`, `handleNavigateNext/Prev` all use stable callbacks

2. **script-editor.tsx**:
   - Added `handleAddAfter` callback with `useCallback`
   - Updated `SegmentItem` props to pass `segmentIndex={segment.index}`
   - Removed all inline arrow functions from SegmentItem props
   - All callbacks now pass stable references

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web build` passes (2.47s)
- [x] No inline arrow functions in SegmentItem props
- [x] SegmentItem properly memoized with React.memo
- [x] Callbacks are stable (parent passes same reference, child uses useCallback internally)
