# Task 16: Feature Hooks - Settings Return Object Memoization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`

## Context

Hooks that return objects create new references on every render. While TanStack Query handles some of this internally, settings hooks return custom objects that could benefit from memoization.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/podcasts/hooks/use-podcast-settings.ts` | 222-243 | Return object not memoized |
| `features/podcasts/hooks/use-podcast-generation.ts` | 129-133 | loadingStates object not memoized |

## Implementation

### 1. Memoize Settings Return Object

```typescript
// use-podcast-settings.ts

// BEFORE
return {
  hostVoice,
  coHostVoice,
  targetDuration,
  instructions,
  setHostVoice,
  setCoHostVoice,
  setTargetDuration,
  setInstructions,
  hasChanges,
  hasScriptSettingsChanges,
  isSaving: updateMutation.isPending,
  saveSettings,
  discardChanges,
};

// AFTER
return useMemo(() => ({
  hostVoice,
  coHostVoice,
  targetDuration,
  instructions,
  setHostVoice,
  setCoHostVoice,
  setTargetDuration,
  setInstructions,
  hasChanges,
  hasScriptSettingsChanges,
  isSaving: updateMutation.isPending,
  saveSettings,
  discardChanges,
}), [
  hostVoice,
  coHostVoice,
  targetDuration,
  instructions,
  setHostVoice,
  setCoHostVoice,
  setTargetDuration,
  setInstructions,
  hasChanges,
  hasScriptSettingsChanges,
  updateMutation.isPending,
  saveSettings,
  discardChanges,
]);
```

### 2. Memoize loadingStates Object

```typescript
// use-podcast-generation.ts

// BEFORE
const loadingStates = {
  generate: generateMutation.isPending,
  createAndGenerate: createAndGenerateMutation.isPending,
  update: updateMutation.isPending,
};

// AFTER
const loadingStates = useMemo(() => ({
  generate: generateMutation.isPending,
  createAndGenerate: createAndGenerateMutation.isPending,
  update: updateMutation.isPending,
}), [
  generateMutation.isPending,
  createAndGenerateMutation.isPending,
  updateMutation.isPending,
]);
```

## Caution

Memoizing return objects with many dependencies can actually hurt performance if dependencies change frequently. Only memoize if:
1. The object is passed to memoized children
2. The dependencies are relatively stable

If the hook's consumer is already handling memoization, this may be unnecessary.

## Alternative: Document Intended Usage

Instead of memoizing in the hook, document that consumers should memoize if needed:

```typescript
/**
 * Returns podcast settings state and handlers.
 *
 * Note: Return object is not memoized. If passing to memoized
 * children, destructure the values you need rather than passing
 * the entire object.
 */
export function usePodcastSettings(...) {
  // ...
}
```

## Implementation Notes

### Changes Made

1. **use-podcast-generation.ts**: Wrapped `loadingStates` object in `useMemo` with deps on individual `isPending` values
2. **use-podcast-settings.ts**: Wrapped return object in `useMemo` with all values and callbacks as dependencies

### Result

Both hooks now maintain stable object references when their values haven't changed, preventing unnecessary re-renders in consumers that rely on object reference equality.

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [x] Settings object memoized (with full dependency list)
- [x] loadingStates object memoized
- [x] No breaking changes to consumers (same API)
