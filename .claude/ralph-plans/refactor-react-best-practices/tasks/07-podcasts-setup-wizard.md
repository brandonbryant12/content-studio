# Task 07: Podcasts Feature - Setup Wizard Dynamic Import

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`

## Context

SetupWizardContainer is only shown for new podcasts (when `isSetupMode(status)` is true). Currently it's eagerly loaded at route level, adding ~250+ lines to the initial bundle for the podcast detail page.

**Current Setup:**
```typescript
// routes/_protected/podcasts/$podcastId.tsx
import { PodcastDetailContainer, SetupWizardContainer } from '@/features/podcasts';
```

## Key Files

| File | Issue |
|------|-------|
| `routes/_protected/podcasts/$podcastId.tsx` | Eager import of SetupWizard |
| `features/podcasts/components/setup-wizard-container.tsx` | Target for dynamic import |

## Implementation

### 1. Dynamic Import in Route

```typescript
// routes/_protected/podcasts/$podcastId.tsx
import { lazy, Suspense } from 'react';
import { PodcastDetailContainer } from '@/features/podcasts/components/podcast-detail-container';

const SetupWizardContainer = lazy(() =>
  import('@/features/podcasts/components/setup-wizard-container')
    .then(m => ({ default: m.SetupWizardContainer }))
);
```

### 2. Add Suspense Boundary

```typescript
function PodcastPage() {
  // ... route logic

  return (
    <Suspense fallback={<SetupWizardSkeleton />}>
      {isSetupMode ? (
        <SetupWizardContainer podcast={podcast} />
      ) : (
        <PodcastDetailContainer podcastId={podcastId} />
      )}
    </Suspense>
  );
}
```

### 3. Create Loading Skeleton

```typescript
// features/podcasts/components/setup/setup-wizard-skeleton.tsx
export function SetupWizardSkeleton() {
  return (
    <div className="setup-wizard">
      <div className="setup-step-indicator">
        <Skeleton className="h-2 w-32" />
      </div>
      <div className="setup-content">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
```

### 4. Verify Bundle Split

After build, verify chunk separation:
```bash
pnpm --filter web build
# Check dist/assets for separate setup-wizard chunk
```

## Alternative: Keep in Container

If the route change is too invasive, the dynamic import can happen in `PodcastDetailContainer`:

```typescript
// podcast-detail-container.tsx
const SetupWizardContainer = lazy(() =>
  import('./setup-wizard-container')
);

export function PodcastDetailContainer({ podcastId }) {
  // ...

  if (isSetupMode(podcast?.status)) {
    return (
      <Suspense fallback={<SetupWizardSkeleton />}>
        <SetupWizardContainer podcast={podcast} />
      </Suspense>
    );
  }

  // ...
}
```

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` passes
- [ ] SetupWizard loads in separate chunk (verify in build output)
- [ ] Loading state shows skeleton while wizard loads
- [ ] Existing functionality preserved
