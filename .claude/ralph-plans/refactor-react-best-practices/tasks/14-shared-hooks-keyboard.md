# Task 14: Shared Hooks - Keyboard Shortcut Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-dependencies.md`

## Context

`use-keyboard-shortcut.ts` includes `enabled` in the useCallback dependencies (line 53), but `enabled` is already checked inside the callback (line 32). This causes unnecessary callback recreation when `enabled` toggles.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `shared/hooks/use-keyboard-shortcut.ts` | 53 | `enabled` in callback deps |
| `shared/hooks/use-keyboard-shortcut.ts` | 61 | `enabled` in effect deps |

## Current Code Analysis

```typescript
// Line 32 - enabled is checked inside
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (!enabled) return;  // Early return handles disabled state
  // ... rest of handler
}, [key, cmdOrCtrl, shift, alt, onTrigger, enabled]); // Line 53 - enabled redundant

useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleKeyDown, enabled]); // Line 61 - enabled causes re-attachment
```

## Implementation

### Option A: Remove `enabled` from Dependencies

Since `enabled` is checked inside the callback, it doesn't need to be a dependency:

```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (!enabled) return;  // This check works even if enabled changes
  // ... rest of handler
}, [key, cmdOrCtrl, shift, alt, onTrigger]); // Remove enabled

useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleKeyDown]); // Remove enabled
```

### Option B: Use Ref for Enabled State

If we want the callback to be completely stable:

```typescript
const enabledRef = useRef(enabled);
enabledRef.current = enabled;

const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (!enabledRef.current) return;
  // ... rest of handler
}, [key, cmdOrCtrl, shift, alt, onTrigger]); // enabled not needed
```

**Recommendation:** Option A is simpler. The callback already handles the enabled check correctly; we just need to remove it from dependencies.

## Test Requirements

```typescript
it('callback remains stable when enabled toggles', () => {
  const onTrigger = vi.fn();
  const { result, rerender } = renderHook(
    ({ enabled }) => useKeyboardShortcut({ key: 's', cmdOrCtrl: true, onTrigger, enabled }),
    { initialProps: { enabled: true } }
  );

  const firstCallback = result.current; // or however the hook exposes it

  rerender({ enabled: false });
  rerender({ enabled: true });

  // Callback reference should be the same
  expect(result.current).toBe(firstCallback);
});
```

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web test` passes
- [ ] `enabled` removed from callback dependencies
- [ ] Event listener not re-attached when enabled toggles
