# Mutations

This document defines optimistic update patterns for Content Studio.

## Overview

All mutations should use optimistic updates by default. This provides:

- **Instant feedback** - UI updates immediately
- **Rollback on error** - Previous state restored if mutation fails
- **SSE confirmation** - Server events confirm and refresh real data

## Standard Optimistic Pattern

Every optimistic mutation follows this structure:

```typescript
useMutation({
  mutationFn: ...,

  onMutate: async (variables) => {
    // 1. Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey });

    // 2. Snapshot previous data
    const previous = queryClient.getQueryData(queryKey);

    // 3. Apply optimistic update
    queryClient.setQueryData(queryKey, optimisticData);

    // 4. Return context for rollback
    return { previous };
  },

  onError: (error, variables, context) => {
    // 5. Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(queryKey, context.previous);
    }

    // 6. Show error toast
    toast.error(getErrorMessage(error, 'Operation failed'));
  },

  // NO onSettled - SSE handles invalidation
});
```

## Optimistic Mutation Factory

Use a factory hook for consistent patterns:

```typescript
// shared/hooks/use-optimistic-mutation.ts

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errors';

export interface OptimisticMutationOptions<TData, TVariables, TCache = TData> {
  /** Query key to apply optimistic update to */
  queryKey: QueryKey;

  /** Mutation function */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /** Transform current cache to optimistic state */
  getOptimisticData: (
    current: TCache | undefined,
    variables: TVariables
  ) => TCache | undefined;

  /** Success message (optional) */
  successMessage?: string | ((data: TData) => string);

  /** Error message fallback */
  errorMessage?: string;

  /** Additional onSuccess handler */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /** Show success toast (default: false, SSE provides confirmation) */
  showSuccessToast?: boolean;
}

export function useOptimisticMutation<TData, TVariables, TCache = TData>({
  queryKey,
  mutationFn,
  getOptimisticData,
  successMessage,
  errorMessage = 'Operation failed',
  onSuccess,
  showSuccessToast = false,
}: OptimisticMutationOptions<TData, TVariables, TCache>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<TCache>(queryKey);
      const optimistic = getOptimisticData(previous, variables);

      if (optimistic !== undefined) {
        queryClient.setQueryData<TCache>(queryKey, optimistic);
      }

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(error, errorMessage));
    },

    onSuccess: (data, variables) => {
      if (showSuccessToast && successMessage) {
        const message = typeof successMessage === 'function'
          ? successMessage(data)
          : successMessage;
        toast.success(message);
      }
      onSuccess?.(data, variables);
    },

    // No onSettled - SSE handles query invalidation
  });
}
```

## Feature-Specific Mutations

### Generation Mutation

```typescript
// features/podcasts/hooks/use-optimistic-generation.ts

import { useQueryClient } from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/api-client';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';

type Podcast = RouterOutput['podcasts']['get'];

/**
 * Optimistic mutation for podcast generation.
 * Shows 'drafting' status immediately while job queues.
 */
export function useOptimisticGeneration(podcastId: string) {
  const queryClient = useQueryClient();
  const queryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  return useOptimisticMutation<{ jobId: string }, { id: string }, Podcast>({
    queryKey,
    mutationFn: (variables) =>
      apiClient.podcasts.generate(variables),

    getOptimisticData: (current) => {
      if (!current) return undefined;

      return {
        ...current,
        status: 'drafting' as const,
        segments: null,
        audioUrl: null,
      };
    },

    successMessage: 'Generation started',
    errorMessage: 'Failed to start generation',
    showSuccessToast: true,

    // Also invalidate list to show updated status
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['podcasts', 'list'],
      });
    },
  });
}
```

### Save Changes Mutation

```typescript
// features/podcasts/hooks/use-optimistic-save-changes.ts

import { apiClient } from '@/clients/api-client';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import type { RouterOutput } from '@repo/api/client';

type Podcast = RouterOutput['podcasts']['get'];

interface Segment {
  speaker: string;
  line: string;
  index: number;
}

interface SaveChangesInput {
  id: string;
  segments?: Segment[];
}

/**
 * Optimistic mutation for saving script changes.
 * Shows 'generating_audio' status while audio regenerates.
 */
export function useOptimisticSaveChanges(podcastId: string) {
  const queryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  return useOptimisticMutation<{ jobId: string }, SaveChangesInput, Podcast>({
    queryKey,
    mutationFn: (variables) =>
      apiClient.podcasts.saveChanges(variables),

    getOptimisticData: (current, variables) => {
      if (!current) return undefined;

      return {
        ...current,
        status: 'generating_audio' as const,
        segments: variables.segments ?? current.segments,
        audioUrl: null,
      };
    },

    successMessage: 'Regenerating audio...',
    errorMessage: 'Failed to save changes',
    showSuccessToast: true,
  });
}
```

### Delete Mutation (List Update)

```typescript
// features/podcasts/hooks/use-optimistic-delete.ts

import { useNavigate } from '@tanstack/react-router';
import { apiClient } from '@/clients/api-client';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import type { RouterOutput } from '@repo/api/client';

type PodcastList = RouterOutput['podcasts']['list'];

/**
 * Optimistic delete - removes from list immediately.
 */
export function useOptimisticDelete() {
  const navigate = useNavigate();
  const queryKey = apiClient.podcasts.list.queryOptions({
    input: {},
  }).queryKey;

  return useOptimisticMutation<void, { id: string }, PodcastList>({
    queryKey,
    mutationFn: (variables) =>
      apiClient.podcasts.delete(variables),

    getOptimisticData: (current, variables) => {
      if (!current) return undefined;
      return current.filter((p) => p.id !== variables.id);
    },

    successMessage: 'Podcast deleted',
    errorMessage: 'Failed to delete podcast',
    showSuccessToast: true,

    onSuccess: () => {
      navigate({ to: '/podcasts' });
    },
  });
}
```

### Settings Update (Silent Save)

```typescript
// features/podcasts/hooks/use-update-settings.ts

import { apiClient } from '@/clients/api-client';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import type { RouterOutput } from '@repo/api/client';

type Podcast = RouterOutput['podcasts']['get'];

interface UpdateInput {
  id: string;
  hostVoice?: string;
  coHostVoice?: string;
  targetDurationMinutes?: number;
}

/**
 * Update settings - silent save (no success toast).
 */
export function useUpdateSettings(podcastId: string) {
  const queryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  return useOptimisticMutation<Podcast, UpdateInput, Podcast>({
    queryKey,
    mutationFn: (variables) =>
      apiClient.podcasts.update(variables),

    getOptimisticData: (current, variables) => {
      if (!current) return undefined;

      return {
        ...current,
        hostVoice: variables.hostVoice ?? current.hostVoice,
        coHostVoice: variables.coHostVoice ?? current.coHostVoice,
        targetDurationMinutes:
          variables.targetDurationMinutes ?? current.targetDurationMinutes,
      };
    },

    errorMessage: 'Failed to save settings',
    showSuccessToast: false,  // Silent save
  });
}
```

## Cache Update Strategies

### Direct Update (Optimistic)

Update cache immediately, SSE confirms later:

```typescript
onMutate: async (variables) => {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, { ...previous, ...variables });
  return { previous };
},
```

### Invalidation on Success

For mutations where optimistic update is impractical:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['documents'] });
},
```

### SSE-Driven Update

Most updates are confirmed via SSE (see [Real-Time](./real-time.md)):

```typescript
// No onSettled needed - SSE handles invalidation
// Optimistic data stays until SSE triggers refetch
```

## When to Show Toasts

| Scenario | Success Toast | Error Toast |
|----------|---------------|-------------|
| Long operation (generation) | Yes | Yes |
| Delete action | Yes | Yes |
| Save with navigation | Yes | Yes |
| Silent save (settings) | No | Yes |
| Background sync | No | Yes |

## Mutation with Form Integration

See [Forms](./forms.md) for connecting mutations to forms.

```typescript
// Container connects form to mutation
function CreatePodcastContainer() {
  const createMutation = useMutation({
    mutationFn: apiClient.podcasts.create,
    onSuccess: (podcast) => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
      navigate({ to: '/podcasts/$podcastId', params: { podcastId: podcast.id } });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create podcast'));
    },
  });

  const handleSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <CreatePodcastForm
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
    />
  );
}
```

## Cache Consistency for Non-Optimistic Mutations

Not all mutations need optimistic updates. Some mutations save data "silently" without immediate UI feedback (e.g., wizard steps, background saves). **These mutations still need to update the cache** to prevent stale data bugs.

### The Problem

When Component A saves data but Component B reads from cache:

```typescript
// WRONG - Wizard saves but doesn't update cache
// Component B will see stale data after transition

const updateMutation = useMutation(
  apiClient.podcasts.update.mutationOptions({
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save'));
    },
    // Missing onSuccess - cache not updated!
  }),
);
```

### The Solution: Always Update Cache on Success

**Every mutation must update or invalidate the cache on success**, even if the current component doesn't display the updated data:

```typescript
// CORRECT - Update cache with API response
const queryKey = getPodcastQueryKey(podcastId);

const updateMutation = useMutation(
  apiClient.podcasts.update.mutationOptions({
    onSuccess: (response) => {
      // Update cache so other components see fresh data
      queryClient.setQueryData(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          ...response,
          // Preserve nested data not in response
          documents: current.documents,
        };
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save'));
    },
  }),
);
```

### When This Matters Most

1. **Multi-step wizards** - Each step saves data for the final view
2. **Modal forms** - Modal saves, parent component displays
3. **Settings panels** - Settings saved here, reflected elsewhere
4. **Cross-component flows** - Any data shared between components

### Decision Tree

```
Does this mutation update server data?
├── No → No cache update needed
└── Yes → Will ANY component read this data from cache?
    ├── No → No cache update needed (rare)
    └── Yes → UPDATE THE CACHE
        ├── Need instant UI feedback? → Use optimistic update (onMutate)
        └── No instant feedback needed? → Update in onSuccess with response
```

### Cache Update Checklist

Before merging any mutation code, verify:

- [ ] Does `onSuccess` update the cache OR invalidate queries?
- [ ] If updating cache: are nested objects preserved (e.g., `documents`)?
- [ ] If this is a wizard/modal: will the destination component have fresh data?

### Alternative: Invalidation

If response shape is complex, invalidate instead:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey });
},
```

This triggers a refetch—less optimal but guarantees consistency.

## Anti-Patterns

### No Rollback Context

```typescript
// WRONG - no way to rollback
onMutate: async () => {
  queryClient.setQueryData(queryKey, optimisticData);
  // Missing: return { previous }
},
onError: () => {
  // Can't rollback - data is stale!
}

// CORRECT
onMutate: async () => {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, optimisticData);
  return { previous };
},
onError: (error, _vars, context) => {
  if (context?.previous) {
    queryClient.setQueryData(queryKey, context.previous);
  }
}
```

### Refetching in onSettled

```typescript
// WRONG - SSE handles this
onSettled: () => {
  queryClient.invalidateQueries({ queryKey });  // Double refetch!
}

// CORRECT - let SSE handle invalidation
// No onSettled needed
```

### Not Canceling Queries

```typescript
// WRONG - race condition possible
onMutate: async () => {
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, optimisticData);
  return { previous };
},

// CORRECT - cancel first
onMutate: async () => {
  await queryClient.cancelQueries({ queryKey });  // Prevent race
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, optimisticData);
  return { previous };
},
```

### Wrong Query Key

```typescript
// WRONG - hardcoded key
queryClient.setQueryData(['podcast', podcastId], optimisticData);

// CORRECT - use oRPC key
const queryKey = apiClient.podcasts.get.queryOptions({
  input: { id: podcastId },
}).queryKey;
queryClient.setQueryData(queryKey, optimisticData);
```

### Missing Cache Update in Wizards/Modals

```typescript
// WRONG - Wizard step saves data but next view sees stale cache
const updateMutation = useMutation(
  apiClient.podcasts.update.mutationOptions({
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save'));
    },
    // No onSuccess → cache not updated!
    // When user transitions to workbench, usePodcastSettings
    // reads stale data from cache
  }),
);

// CORRECT - Update cache so destination component has fresh data
const queryKey = getPodcastQueryKey(podcast.id);

const updateMutation = useMutation(
  apiClient.podcasts.update.mutationOptions({
    onSuccess: (response) => {
      queryClient.setQueryData(queryKey, (current) => ({
        ...current,
        ...response,
        documents: current?.documents, // Preserve nested data
      }));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save'));
    },
  }),
);
```

### Generic Error Messages

```typescript
// WRONG
onError: () => {
  toast.error('Something went wrong');
}

// CORRECT
import { getErrorMessage } from '@/shared/lib/errors';

onError: (error) => {
  toast.error(getErrorMessage(error, 'Failed to update podcast'));
}
```

### Awaiting Mutation Without Error Handling

```typescript
// WRONG - unhandled rejection
const handleClick = async () => {
  await mutation.mutateAsync(data);
  // If mutation fails, this throws!
};

// CORRECT - handle in onError
const mutation = useMutation({
  onError: (error) => {
    toast.error(getErrorMessage(error, 'Failed'));
  },
});

const handleClick = () => {
  mutation.mutate(data);  // onError handles failures
};

// OR - wrap in try/catch if you need to react to failure
const handleClick = async () => {
  try {
    await mutation.mutateAsync(data);
    doSomethingAfterSuccess();
  } catch {
    // Error already shown via onError
  }
};
```
