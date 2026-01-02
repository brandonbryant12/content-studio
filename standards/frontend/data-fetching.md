# Data Fetching

This document defines TanStack Query patterns with oRPC for Content Studio.

## Overview

All data fetching uses TanStack Query with the oRPC client. Key principles:

1. **Queries are the source of truth** - No local data storage
2. **Suspense-first** - Use `useSuspenseQuery` for cleaner loading states
3. **Prefetch in loaders** - Route loaders prefetch for instant navigation
4. **Custom hooks wrap queries** - Features expose hooks, not raw queries

## Query Hook Patterns

### Basic Query Hook

```typescript
// features/podcasts/hooks/use-podcast.ts

import { useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '@/clients/api-client';

/**
 * Fetch a single podcast by ID.
 * Uses Suspense - wrap with Suspense boundary.
 */
export function usePodcast(podcastId: string) {
  return useSuspenseQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );
}
```

### List Query Hook

```typescript
// features/podcasts/hooks/use-podcast-list.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/clients/api-client';

interface UsePodcastListOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch podcast list with options.
 */
export function usePodcastList(options: UsePodcastListOptions = {}) {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.podcasts.list.queryOptions({ input: { limit } }),
    enabled,
  });
}
```

### Query with Select Transform

```typescript
// features/podcasts/hooks/use-podcasts-ordered.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/clients/api-client';

interface UsePodcastsOrderedOptions {
  limit?: number;
  order?: 'asc' | 'desc';
}

/**
 * Fetch podcasts with client-side ordering.
 * Uses select to transform data without refetching.
 */
export function usePodcastsOrdered(options: UsePodcastsOrderedOptions = {}) {
  const { limit, order = 'desc' } = options;

  return useQuery({
    ...apiClient.podcasts.list.queryOptions({ input: { limit } }),
    select: (data) => {
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return order === 'desc' ? dateB - dateA : dateA - dateB;
      });
      return sorted;
    },
  });
}
```

## Query Key Conventions

oRPC generates query keys automatically. Access them via `queryOptions()`:

```typescript
// Get query key for a specific podcast
const queryKey = apiClient.podcasts.get.queryOptions({
  input: { id: podcastId },
}).queryKey;

// Get query key for list
const listQueryKey = apiClient.podcasts.list.queryOptions({
  input: {},
}).queryKey;
```

### Query Key Structure

```typescript
// Single entity: ['podcasts', 'get', { input: { id: 'pod_123' } }]
// List: ['podcasts', 'list', { input: {} }]
// List with filter: ['podcasts', 'list', { input: { status: 'ready' } }]
```

### Invalidation Patterns

```typescript
// Invalidate specific podcast
queryClient.invalidateQueries({
  queryKey: apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey,
});

// Invalidate all podcast queries (list and individual)
queryClient.invalidateQueries({
  queryKey: ['podcasts'],
});

// Invalidate only list queries
queryClient.invalidateQueries({
  queryKey: ['podcasts', 'list'],
});
```

## useSuspenseQuery vs useQuery

### Use `useSuspenseQuery` when:

- The data is required to render
- You have a Suspense boundary above
- You want cleaner component code (no loading checks)

```typescript
// Container with Suspense
function PodcastDetailContainer() {
  // No isPending check needed - Suspense handles loading
  const { data: podcast } = useSuspenseQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );

  return <PodcastDetail podcast={podcast} />;
}
```

### Use `useQuery` when:

- Data is optional
- You need conditional fetching
- You want explicit loading/error states

```typescript
// Optional data with explicit loading
function Dashboard() {
  const { data: recentPodcasts, isPending } = useQuery(
    apiClient.podcasts.list.queryOptions({ input: { limit: 5 } }),
  );

  if (isPending) return <RecentPodcastsSkeleton />;

  return <RecentPodcasts podcasts={recentPodcasts ?? []} />;
}
```

## Prefetching in Route Loaders

Use route loaders to prefetch data for instant navigation:

```typescript
// routes/_protected/podcasts/$podcastId.tsx

import { createFileRoute } from '@tanstack/react-router';
import { queryClient } from '@/clients/query-client';
import { apiClient } from '@/clients/api-client';

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastPage,
});
```

### Parallel Prefetching

```typescript
// Prefetch multiple resources in parallel
loader: async ({ params }) => {
  await Promise.all([
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
    queryClient.ensureQueryData(
      apiClient.documents.list.queryOptions({ input: {} }),
    ),
  ]);
},
```

## Stale Time and Cache Time

### Defaults

```typescript
// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,      // 1 minute
      gcTime: 1000 * 60 * 5,     // 5 minutes (formerly cacheTime)
    },
  },
});
```

### Per-Query Overrides

```typescript
// Frequently updated data - short stale time
useQuery({
  ...apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  staleTime: 1000 * 10,  // 10 seconds
});

// Rarely changing data - long stale time
useQuery({
  ...apiClient.voices.list.queryOptions({ input: {} }),
  staleTime: 1000 * 60 * 60,  // 1 hour
});
```

## Dependent Queries

When one query depends on another:

```typescript
function PodcastWithDocuments({ podcastId }: Props) {
  // First query
  const { data: podcast } = useSuspenseQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );

  // Dependent query - uses result from first
  const { data: documents } = useSuspenseQuery({
    ...apiClient.documents.list.queryOptions({
      input: { ids: podcast.documentIds },
    }),
    enabled: podcast.documentIds.length > 0,
  });

  return <PodcastView podcast={podcast} documents={documents} />;
}
```

## Error Handling in Queries

### Using Error Boundaries

```typescript
// Route-level error handling
export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  errorComponent: ({ error }) => <PodcastError error={error} />,
  component: PodcastPage,
});
```

### Query-Level Error Handling

```typescript
const { data, error, isError } = useQuery({
  ...apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  // Query won't retry on 404
  retry: (failureCount, error) => {
    if (isDefinedError(error) && error.code === 'PODCAST_NOT_FOUND') {
      return false;
    }
    return failureCount < 3;
  },
});

if (isError) {
  return <ErrorDisplay error={error} />;
}
```

## Query Utilities

### Checking Cache State

```typescript
// Check if data is in cache
const cachedPodcast = queryClient.getQueryData(
  apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }).queryKey,
);

// Check query state
const queryState = queryClient.getQueryState(
  apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }).queryKey,
);
```

### Manual Cache Updates

```typescript
// Update cache directly (for optimistic updates)
queryClient.setQueryData(
  apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }).queryKey,
  (old) => ({ ...old, title: 'New Title' }),
);
```

## Anti-Patterns

### Fetching in Event Handlers

```typescript
// WRONG - fetch in click handler
const handleClick = async () => {
  const podcast = await apiClient.podcasts.get({ input: { id } });
  setData(podcast);
};

// CORRECT - use query with enabled flag
const { data: podcast, refetch } = useQuery({
  ...apiClient.podcasts.get.queryOptions({ input: { id } }),
  enabled: shouldFetch,
});
```

### Storing Query Data in State

```typescript
// WRONG - duplicating data
const { data } = useQuery(...);
const [localData, setLocalData] = useState(data);

// CORRECT - use query data directly
const { data } = useQuery(...);
// Use data directly, no local copy
```

### Ignoring Query Keys

```typescript
// WRONG - hardcoded key
queryClient.invalidateQueries({ queryKey: ['podcasts', id] });

// CORRECT - use oRPC-generated key
queryClient.invalidateQueries({
  queryKey: apiClient.podcasts.get.queryOptions({ input: { id } }).queryKey,
});
```

### Excessive Refetching

```typescript
// WRONG - refetching on every render
useQuery({
  ...options,
  staleTime: 0,
  refetchOnMount: 'always',
});

// CORRECT - reasonable defaults
useQuery({
  ...options,
  staleTime: 1000 * 60,  // 1 minute
});
```

### Mixing Suspense and Non-Suspense

```typescript
// WRONG - inconsistent in same component
function Component() {
  const { data: a } = useSuspenseQuery(...);  // Suspends
  const { data: b, isPending } = useQuery(...);  // Doesn't
  if (isPending) return <Spinner />;  // Confusing!
}

// CORRECT - be consistent
function Component() {
  const { data: a } = useSuspenseQuery(...);
  const { data: b } = useSuspenseQuery(...);
  // Both suspend, boundary handles loading
}
```
