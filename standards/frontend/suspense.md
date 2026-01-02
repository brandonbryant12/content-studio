# Suspense

This document defines Suspense boundary patterns for loading and error states.

## Overview

React Suspense provides a declarative way to handle loading states. Combined with Error Boundaries, it creates consistent loading and error UI across the app.

## Route-Level Boundaries

Use TanStack Router's built-in Suspense support:

```typescript
// routes/_protected/podcasts/$podcastId.tsx

import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { queryClient } from '@/clients/query-client';
import { apiClient } from '@/clients/api-client';
import { PodcastDetailContainer } from '@/features/podcasts';
import { PodcastSkeleton } from '@/shared/components/skeletons';
import { PodcastError } from '@/shared/components/errors';

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  // Prefetch data for instant navigation
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),

  // Pending UI while loading
  pendingComponent: () => <PodcastSkeleton />,

  // Error UI on failure
  errorComponent: ({ error, reset }) => (
    <PodcastError error={error} onRetry={reset} />
  ),

  component: PodcastPage,
});

function PodcastPage() {
  return (
    <Suspense fallback={<PodcastSkeleton />}>
      <PodcastDetailContainer />
    </Suspense>
  );
}
```

## Component-Level Boundaries

For nested loading states within a page:

```typescript
// features/podcasts/components/podcast-detail-container.tsx

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ScriptEditorContainer } from './script-editor-container';
import { ScriptEditorSkeleton } from './script-editor-skeleton';
import { ScriptEditorError } from './script-editor-error';

export function PodcastDetailContainer() {
  const { podcastId } = Route.useParams();
  const { data: podcast } = useSuspenseQuery(...);

  return (
    <div>
      <PodcastHeader podcast={podcast} />

      {/* Nested Suspense for script editor */}
      <ErrorBoundary
        FallbackComponent={ScriptEditorError}
        resetKeys={[podcastId]}
      >
        <Suspense fallback={<ScriptEditorSkeleton />}>
          <ScriptEditorContainer podcastId={podcastId} />
        </Suspense>
      </ErrorBoundary>

      <PodcastSettings podcast={podcast} />
    </div>
  );
}
```

## Skeleton Components

### Basic Skeleton Pattern

```typescript
// shared/components/skeletons/podcast-skeleton.tsx

export function PodcastSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-1/3 rounded bg-muted" />
        <div className="h-4 w-1/4 rounded bg-muted" />
      </div>

      {/* Content area */}
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-4/6 rounded bg-muted" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <div className="h-10 w-24 rounded-md bg-muted" />
        <div className="h-10 w-24 rounded-md bg-muted" />
      </div>
    </div>
  );
}
```

### List Skeleton

```typescript
// shared/components/skeletons/podcast-list-skeleton.tsx

export function PodcastListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PodcastCardSkeleton key={i} />
      ))}
    </div>
  );
}

function PodcastCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
    </div>
  );
}
```

### Skeleton with Matching Layout

Mirror the actual component layout:

```typescript
// features/podcasts/components/script-editor-skeleton.tsx

export function ScriptEditorSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="h-5 w-24 rounded bg-muted animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Segments skeleton */}
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="flex-1 h-8 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Error Boundary Components

### Basic Error Fallback

```typescript
// shared/components/errors/error-fallback.tsx

import { Button } from '@repo/ui/components/button';
import { AlertCircle } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button onClick={resetErrorBoundary} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
```

### Feature-Specific Error

```typescript
// features/podcasts/components/podcast-error.tsx

import { isDefinedError } from '@repo/api/client';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@repo/ui/components/button';

interface PodcastErrorProps {
  error: Error;
  onRetry?: () => void;
}

export function PodcastError({ error, onRetry }: PodcastErrorProps) {
  const navigate = useNavigate();

  // Handle specific error codes
  if (isDefinedError(error) && error.code === 'PODCAST_NOT_FOUND') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-lg font-semibold">Podcast not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This podcast may have been deleted or you don't have access.
        </p>
        <Button
          onClick={() => navigate({ to: '/podcasts' })}
          className="mt-6"
        >
          Back to podcasts
        </Button>
      </div>
    );
  }

  // Generic error
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold">Failed to load podcast</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || 'Please try again'}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-6">
          Retry
        </Button>
      )}
    </div>
  );
}
```

## Error Boundary with Reset Keys

Use `resetKeys` to automatically reset the boundary when navigating:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function PodcastPage() {
  const { podcastId } = Route.useParams();

  return (
    <ErrorBoundary
      FallbackComponent={PodcastError}
      resetKeys={[podcastId]}  // Resets when podcastId changes
      onReset={() => {
        // Optional: Invalidate queries on reset
        queryClient.invalidateQueries({ queryKey: ['podcasts', podcastId] });
      }}
    >
      <Suspense fallback={<PodcastSkeleton />}>
        <PodcastDetailContainer />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Loading State Patterns

### Spinner Overlay

For blocking operations:

```typescript
function SaveButton({ isSaving, onSave }) {
  return (
    <Button onClick={onSave} disabled={isSaving}>
      {isSaving ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          Saving...
        </>
      ) : (
        'Save'
      )}
    </Button>
  );
}
```

### Progress Indicator

For long operations:

```typescript
function GenerationProgress({ status }) {
  const stages = ['drafting', 'generating_script', 'generating_audio', 'ready'];
  const currentIndex = stages.indexOf(status);

  return (
    <div className="flex items-center gap-2">
      {stages.map((stage, i) => (
        <div
          key={stage}
          className={cn(
            'h-2 flex-1 rounded-full',
            i <= currentIndex ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}
```

### Inline Loading

For partial updates:

```typescript
function VoiceSelect({ value, onChange, isLoading }) {
  return (
    <div className="relative">
      <Select value={value} onValueChange={onChange}>
        {/* ... */}
      </Select>
      {isLoading && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <Spinner className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
```

## When to Use Suspense vs isPending

### Use Suspense when:

- Data is required to render
- You want cleaner component code
- You're using `useSuspenseQuery`

```typescript
// Suspense approach
function PodcastPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <PodcastContent />
    </Suspense>
  );
}

function PodcastContent() {
  const { data } = useSuspenseQuery(...);
  return <div>{data.title}</div>;  // No null check needed
}
```

### Use isPending when:

- Data is optional
- You need more control over loading UI
- You're using `useQuery`

```typescript
// isPending approach
function RecentPodcasts() {
  const { data, isPending } = useQuery(...);

  if (isPending) return <Skeleton />;

  return (
    <ul>
      {data?.map(podcast => (
        <li key={podcast.id}>{podcast.title}</li>
      ))}
    </ul>
  );
}
```

## Anti-Patterns

### No Fallback

```typescript
// WRONG - no loading state
<Suspense>
  <PodcastContent />
</Suspense>

// CORRECT
<Suspense fallback={<PodcastSkeleton />}>
  <PodcastContent />
</Suspense>
```

### Missing Error Boundary

```typescript
// WRONG - errors crash the app
<Suspense fallback={<Skeleton />}>
  <FailableContent />
</Suspense>

// CORRECT - graceful error handling
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Suspense fallback={<Skeleton />}>
    <FailableContent />
  </Suspense>
</ErrorBoundary>
```

### Generic Skeletons

```typescript
// WRONG - doesn't match layout
<Suspense fallback={<Spinner />}>
  <ComplexLayout />
</Suspense>

// CORRECT - skeleton matches content shape
<Suspense fallback={<ComplexLayoutSkeleton />}>
  <ComplexLayout />
</Suspense>
```

### Suspense Too High

```typescript
// WRONG - whole page shows skeleton for any sub-component
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <MainContent />  {/* Slow query here */}
  <Sidebar />
</Suspense>

// CORRECT - only affected area shows skeleton
<Header />
<Suspense fallback={<ContentSkeleton />}>
  <MainContent />
</Suspense>
<Sidebar />
```

### Not Resetting Error Boundary

```typescript
// WRONG - stale error on navigation
<ErrorBoundary FallbackComponent={Error}>
  <DynamicContent id={id} />
</ErrorBoundary>

// CORRECT - resets when id changes
<ErrorBoundary
  FallbackComponent={Error}
  resetKeys={[id]}
>
  <DynamicContent id={id} />
</ErrorBoundary>
```
