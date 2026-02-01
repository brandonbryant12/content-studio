// features/brands/components/brand-steps/lazy-steps.tsx
// Lazy-loaded step components for code splitting

import { lazy, Suspense, type ComponentType } from 'react';
import { cn } from '@repo/ui/lib/utils';

// Simple skeleton component (inline to avoid missing dependency)
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
    />
  );
}

// Lazy load each step component
export const LazyStepBasics = lazy(() =>
  import('./step-basics').then((m) => ({ default: m.StepBasics })),
);

export const LazyStepMission = lazy(() =>
  import('./step-mission').then((m) => ({ default: m.StepMission })),
);

export const LazyStepValues = lazy(() =>
  import('./step-values').then((m) => ({ default: m.StepValues })),
);

export const LazyStepColors = lazy(() =>
  import('./step-colors').then((m) => ({ default: m.StepColors })),
);

export const LazyStepVoice = lazy(() =>
  import('./step-voice').then((m) => ({ default: m.StepVoice })),
);

export const LazyStepPersonas = lazy(() =>
  import('./step-personas').then((m) => ({ default: m.StepPersonas })),
);

export const LazyStepSegments = lazy(() =>
  import('./step-segments').then((m) => ({ default: m.StepSegments })),
);

export const LazyStepReview = lazy(() =>
  import('./step-review').then((m) => ({ default: m.StepReview })),
);

/**
 * Loading fallback for step components.
 * Mimics the two-column layout with skeleton elements.
 */
export function StepLoadingFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Form skeleton */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>

      {/* Right side: AI panel skeleton */}
      <div className="rounded-xl border bg-card p-4 h-full min-h-[400px]">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-2/3 ml-auto" />
          <Skeleton className="h-12 w-4/5" />
        </div>
      </div>
    </div>
  );
}

/**
 * Review step loading fallback (single column layout).
 */
export function ReviewLoadingFallback({ className }: { className?: string }) {
  return (
    <div className={cn('h-full overflow-y-auto', className)}>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Header skeleton */}
        <div className="text-center space-y-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>

        {/* Card skeleton */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4 pb-4 border-b">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="space-y-6 mt-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to wrap a lazy component with Suspense and appropriate fallback.
 */
export function withSuspense<P extends object>(
  LazyComponent: ComponentType<P>,
  Fallback: ComponentType<{ className?: string }> = StepLoadingFallback,
) {
  return function SuspenseWrapper(props: P & { className?: string }) {
    return (
      <Suspense fallback={<Fallback className={props.className} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
