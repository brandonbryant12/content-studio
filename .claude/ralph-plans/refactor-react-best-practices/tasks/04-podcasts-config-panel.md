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

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] Tab click uses data attribute pattern or stable callback
- [ ] Toggle uses functional setState
- [ ] No inline arrow functions in event handlers
