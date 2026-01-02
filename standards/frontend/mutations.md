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
        activeVersion: current.activeVersion
          ? {
              ...current.activeVersion,
              status: 'drafting' as const,
              segments: null,
              audioUrl: null,
            }
          : null,
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
        activeVersion: current.activeVersion
          ? {
              ...current.activeVersion,
              status: 'generating_audio' as const,
              segments: variables.segments ?? current.activeVersion.segments,
              audioUrl: null,
            }
          : null,
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
