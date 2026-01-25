# Task 04: Podcasts Feature - Config Panel Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md`

## Context

ConfigPanel has inline onClick handlers for tab navigation and prompt viewer toggle. While TABS array is already hoisted (good pattern), the event handlers create new functions on each render.

**Current Issues (config-panel.tsx):**
- Line 55: `onClick={() => setActiveTab(tab.id)}` - inline function in map
- Line 66: `onClick={() => setShowPromptViewer(!showPromptViewer)}` - uses closure over state

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/podcasts/components/workbench/config-panel.tsx` | 55 | Inline onClick in tab map |
| `features/podcasts/components/workbench/config-panel.tsx` | 66 | Toggle uses closure |

## Implementation

### 1. Tab Click Handler

```typescript
// BEFORE
{TABS.map((tab) => (
  <button
    onClick={() => setActiveTab(tab.id)}
    ...
  />
))}

// AFTER - Use functional update or data attribute pattern
const handleTabClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
  const tabId = e.currentTarget.dataset.tabId as TabId;
  setActiveTab(tabId);
}, []);

// In JSX
<button
  data-tab-id={tab.id}
  onClick={handleTabClick}
  ...
/>
```

### 2. Toggle Handler with Functional Update

```typescript
// BEFORE - closure over showPromptViewer
onClick={() => setShowPromptViewer(!showPromptViewer)}

// AFTER - functional setState, no closure needed
const handleTogglePromptViewer = useCallback(() => {
  setShowPromptViewer(prev => !prev);
}, []); // Empty deps - functional update doesn't need current value
```

## Note on TABS Array

Already correctly hoisted outside component (lines 23-26):
```typescript
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'produce', label: 'Generate', icon: <LightningBoltIcon /> },
  { id: 'mix', label: 'Settings', icon: <MixerHorizontalIcon /> },
];
```

This is a good pattern - no changes needed.

## Implementation Notes

### Changes Made:
1. Added `handleTabClick` using data-attribute pattern (`data-tab-id`)
2. Added `handleTogglePromptViewer` using functional setState `(prev) => !prev`
3. Added `handleClosePromptViewer` for the PromptViewerPanel onClose prop
4. All three inline arrow functions replaced with stable useCallback references

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web build` passes (2.47s)
- [x] Tab click uses data attribute pattern with stable callback
- [x] Toggle uses functional setState
- [x] No inline arrow functions in event handlers
