# Task 14: Frontend - Data Fetching Hooks

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/frontend/data-fetching.md`
- [ ] `apps/web/src/features/podcasts/hooks/` - Reference hooks
- [ ] `apps/web/src/features/voiceovers/hooks/` - Reference hooks

## Context

TanStack Query patterns:
- Query key factories for cache management
- `useSuspenseQuery` for suspense-based data fetching
- Separate hooks for different data needs (list vs. detail)
- Optimistic updates via mutation hooks

## Key Files

### Create New Files:
- `apps/web/src/features/infographics/hooks/use-infographic.ts`
- `apps/web/src/features/infographics/hooks/use-infographic-list.ts`
- `apps/web/src/features/infographics/hooks/use-selections.ts`
- `apps/web/src/features/infographics/hooks/use-ai-extraction.ts`
- `apps/web/src/features/infographics/hooks/use-infographic-settings.ts`
- `apps/web/src/features/infographics/hooks/index.ts`

## Implementation Notes

### Query Keys

```typescript
// apps/web/src/features/infographics/hooks/query-keys.ts
export const infographicKeys = {
  all: ['infographics'] as const,
  lists: () => [...infographicKeys.all, 'list'] as const,
  list: (filters?: { limit?: number; offset?: number }) =>
    [...infographicKeys.lists(), filters] as const,
  details: () => [...infographicKeys.all, 'detail'] as const,
  detail: (id: string) => [...infographicKeys.details(), id] as const,
};

export const getInfographicQueryKey = (id: string) => infographicKeys.detail(id);
export const getInfographicListQueryKey = (filters?: { limit?: number; offset?: number }) =>
  infographicKeys.list(filters);
```

### Use Infographic (Single)

```typescript
// apps/web/src/features/infographics/hooks/use-infographic.ts
import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { infographicKeys } from './query-keys';

export const useInfographic = (infographicId: string) => {
  const apiClient = useApiClient();

  return useSuspenseQuery({
    queryKey: infographicKeys.detail(infographicId),
    queryFn: () => apiClient.infographics.get({ id: infographicId }),
  });
};

// Non-suspense version for conditional fetching
export const useInfographicQuery = (infographicId: string | undefined) => {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: infographicKeys.detail(infographicId ?? ''),
    queryFn: () => apiClient.infographics.get({ id: infographicId! }),
    enabled: !!infographicId,
  });
};
```

### Use Infographic List

```typescript
// apps/web/src/features/infographics/hooks/use-infographic-list.ts
import { useSuspenseQuery, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { infographicKeys } from './query-keys';

export const useInfographicList = (options?: { limit?: number; offset?: number }) => {
  const apiClient = useApiClient();
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  return useSuspenseQuery({
    queryKey: infographicKeys.list({ limit, offset }),
    queryFn: () => apiClient.infographics.list({ limit, offset }),
  });
};

// For infinite scrolling
export const useInfographicListInfinite = (pageSize = 20) => {
  const apiClient = useApiClient();

  return useInfiniteQuery({
    queryKey: infographicKeys.lists(),
    queryFn: ({ pageParam = 0 }) =>
      apiClient.infographics.list({ limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.items.length, 0);
      if (totalFetched >= lastPage.total) return undefined;
      return totalFetched;
    },
    initialPageParam: 0,
  });
};
```

### Use Selections

```typescript
// apps/web/src/features/infographics/hooks/use-selections.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { infographicKeys } from './query-keys';
import { toast } from 'sonner';

export const useAddSelection = (infographicId: string) => {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      documentId: string;
      selectedText: string;
      startOffset?: number;
      endOffset?: number;
    }) =>
      apiClient.infographics.addSelection({
        infographicId,
        ...data,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: infographicKeys.detail(infographicId) });

      if (result.warningMessage) {
        toast.warning(result.warningMessage);
      }
    },
    onError: (error) => {
      toast.error('Failed to add selection');
    },
  });
};

export const useRemoveSelection = (infographicId: string) => {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (selectionId: string) =>
      apiClient.infographics.removeSelection({ infographicId, selectionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infographicKeys.detail(infographicId) });
    },
    onError: () => {
      toast.error('Failed to remove selection');
    },
  });
};

export const useReorderSelections = (infographicId: string) => {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedSelectionIds: string[]) =>
      apiClient.infographics.reorderSelections({ infographicId, orderedSelectionIds }),
    onMutate: async (orderedSelectionIds) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: infographicKeys.detail(infographicId) });

      const previous = queryClient.getQueryData(infographicKeys.detail(infographicId));

      queryClient.setQueryData(infographicKeys.detail(infographicId), (old: any) => {
        if (!old) return old;
        const selectionsMap = new Map(old.selections.map((s: any) => [s.id, s]));
        const reordered = orderedSelectionIds
          .map((id, index) => {
            const selection = selectionsMap.get(id);
            return selection ? { ...selection, orderIndex: index } : null;
          })
          .filter(Boolean);
        return { ...old, selections: reordered };
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(infographicKeys.detail(infographicId), context.previous);
      }
      toast.error('Failed to reorder selections');
    },
  });
};
```

### Use AI Extraction

```typescript
// apps/web/src/features/infographics/hooks/use-ai-extraction.ts
import { useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface KeyPointSuggestion {
  text: string;
  documentId: string;
  documentTitle: string;
  relevance: 'high' | 'medium';
  category?: string;
}

export const useAIExtraction = (infographicId: string) => {
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: () => apiClient.infographics.extractKeyPoints({ infographicId }),
    onError: (error) => {
      toast.error('Failed to extract key points');
    },
  });
};
```

### Use Infographic Settings

```typescript
// apps/web/src/features/infographics/hooks/use-infographic-settings.ts
import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { infographicKeys } from './query-keys';

export interface InfographicSettings {
  infographicType: string;
  aspectRatio: string;
  customInstructions: string | null;
  feedbackInstructions: string | null;
  styleOptions: Record<string, unknown> | null;
}

export const useInfographicSettings = (
  infographicId: string,
  initialSettings: InfographicSettings,
) => {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      settings.infographicType !== initialSettings.infographicType ||
      settings.aspectRatio !== initialSettings.aspectRatio ||
      settings.customInstructions !== initialSettings.customInstructions ||
      settings.feedbackInstructions !== initialSettings.feedbackInstructions;
    setHasChanges(changed);
  }, [settings, initialSettings]);

  // Sync with server data
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<InfographicSettings>) =>
      apiClient.infographics.update({ id: infographicId, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infographicKeys.detail(infographicId) });
      setHasChanges(false);
    },
  });

  const setInfographicType = useCallback((type: string) => {
    setSettings((prev) => ({ ...prev, infographicType: type }));
  }, []);

  const setAspectRatio = useCallback((ratio: string) => {
    setSettings((prev) => ({ ...prev, aspectRatio: ratio }));
  }, []);

  const setCustomInstructions = useCallback((instructions: string | null) => {
    setSettings((prev) => ({ ...prev, customInstructions: instructions }));
  }, []);

  const setFeedbackInstructions = useCallback((instructions: string | null) => {
    setSettings((prev) => ({ ...prev, feedbackInstructions: instructions }));
  }, []);

  const saveSettings = useCallback(() => {
    return updateMutation.mutateAsync({
      infographicType: settings.infographicType,
      aspectRatio: settings.aspectRatio,
      customInstructions: settings.customInstructions,
      feedbackInstructions: settings.feedbackInstructions,
      styleOptions: settings.styleOptions,
    });
  }, [settings, updateMutation]);

  return {
    settings,
    hasChanges,
    setInfographicType,
    setAspectRatio,
    setCustomInstructions,
    setFeedbackInstructions,
    saveSettings,
    isSaving: updateMutation.isPending,
  };
};
```

### Index Export

```typescript
// apps/web/src/features/infographics/hooks/index.ts
export * from './query-keys';
export * from './use-infographic';
export * from './use-infographic-list';
export * from './use-selections';
export * from './use-ai-extraction';
export * from './use-infographic-settings';
```

## Verification Log

<!-- Agent writes verification results here -->
