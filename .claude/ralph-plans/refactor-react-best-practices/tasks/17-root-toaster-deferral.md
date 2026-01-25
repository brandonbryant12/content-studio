# Task 17: Root Layout - Toaster Deferral

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md`

## Context

The Toaster component from `sonner` is imported at the root level and always loaded, even though toasts are only shown in response to user actions. This can be deferred until after hydration.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `routes/__root.tsx` | 1 | Toaster imported eagerly |

## Implementation Options

### Option A: Dynamic Import with useEffect

```typescript
// __root.tsx
import { lazy, Suspense, useEffect, useState } from 'react';

const Toaster = lazy(() => import('sonner').then(m => ({ default: m.Toaster })));

function RootLayout() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* ... rest of layout */}
      {mounted && (
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      )}
    </>
  );
}
```

### Option B: Defer with requestIdleCallback

```typescript
import { lazy, Suspense, useEffect, useState } from 'react';

const Toaster = lazy(() => import('sonner').then(m => ({ default: m.Toaster })));

function RootLayout() {
  const [showToaster, setShowToaster] = useState(false);

  useEffect(() => {
    // Load after browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => setShowToaster(true));
    } else {
      setTimeout(() => setShowToaster(true), 100);
    }
  }, []);

  return (
    <>
      {/* ... rest of layout */}
      {showToaster && (
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      )}
    </>
  );
}
```

### Option C: Keep as-is (if sonner is small)

Check sonner's bundle size first:
```bash
npx bundlephobia sonner
```

If it's <5KB gzipped, the optimization may not be worth the complexity.

**Recommendation:** Check bundle size first. If significant (>10KB), use Option A.

## Verification

1. Toast functionality still works after deferral
2. No visible delay when triggering first toast
3. Bundle analysis shows sonner in separate chunk (if using dynamic import)

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` passes
- [ ] Toast functionality verified working
- [ ] Bundle size impact measured
