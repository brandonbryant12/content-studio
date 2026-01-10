// features/infographics/hooks/use-selections.ts

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import type { RouterOutput } from '@repo/api/client';
import { getInfographicQueryKey } from './use-infographic';
import { getErrorMessage } from '@/shared/lib/errors';

// =============================================================================
// Constants
// =============================================================================

export const SELECTION_SOFT_LIMIT = 10;
export const MAX_SELECTION_LENGTH = 500;

// =============================================================================
// Types
// =============================================================================

type Infographic = RouterOutput['infographics']['get'];
type Selection = Infographic['selections'][number];
type AddSelectionResult = RouterOutput['infographics']['addSelection'];

export interface UseSelectionsOptions {
  initialSelections: Selection[];
}

export interface UseSelectionsReturn {
  /** Current selections (local state) */
  selections: Selection[];

  /** Sorted selection IDs */
  selectionIds: Selection['id'][];

  /** Reorder selections locally */
  reorderSelections: (orderedIds: Selection['id'][]) => void;

  /** Discard local changes and reset to initial */
  discardChanges: () => void;

  /** Whether there are unsaved changes */
  hasChanges: boolean;
}

// =============================================================================
// State Management Hook
// =============================================================================

/**
 * Local state management for infographic selections.
 * Syncs with server data and tracks local changes.
 */
export function useSelections({
  initialSelections,
}: UseSelectionsOptions): UseSelectionsReturn {
  const [selections, setSelections] = useState<Selection[]>(initialSelections);
  const prevInitialRef = useRef<string>('');

  // Sync with server data when it changes
  useEffect(() => {
    const serialized = JSON.stringify(
      initialSelections.map((s) => `${s.id}:${s.orderIndex}`).sort(),
    );
    if (serialized !== prevInitialRef.current) {
      prevInitialRef.current = serialized;
      setSelections(initialSelections);
    }
  }, [initialSelections]);

  const selectionIds = useMemo(
    () =>
      [...selections]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => s.id),
    [selections],
  );

  const hasChanges = useMemo(() => {
    const initialIds = [...initialSelections]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => s.id);
    if (initialIds.length !== selectionIds.length) return true;
    return initialIds.some((id, i) => id !== selectionIds[i]);
  }, [initialSelections, selectionIds]);

  const reorderSelections = useCallback((orderedIds: Selection['id'][]) => {
    setSelections((prev) => {
      const selectionMap = new Map(prev.map((s) => [s.id, s]));
      return orderedIds
        .map((id, index) => {
          const selection = selectionMap.get(id);
          if (!selection) return null;
          return { ...selection, orderIndex: index };
        })
        .filter((s): s is Selection => s !== null);
    });
  }, []);

  const discardChanges = useCallback(() => {
    setSelections(initialSelections);
  }, [initialSelections]);

  return {
    selections,
    selectionIds,
    reorderSelections,
    discardChanges,
    hasChanges,
  };
}

// =============================================================================
// Mutation Hooks
// =============================================================================

// Extract mutationFn from oRPC options
const addSelectionMutationFn =
  apiClient.infographics.addSelection.mutationOptions().mutationFn!;

const removeSelectionMutationFn =
  apiClient.infographics.removeSelection.mutationOptions().mutationFn!;

const updateSelectionMutationFn =
  apiClient.infographics.updateSelection.mutationOptions().mutationFn!;

const reorderSelectionsMutationFn =
  apiClient.infographics.reorderSelections.mutationOptions().mutationFn!;

// -----------------------------------------------------------------------------
// Add Selection
// -----------------------------------------------------------------------------

interface AddSelectionInput {
  id: string;
  documentId: string;
  selectedText: string;
  startOffset?: number;
  endOffset?: number;
}

/**
 * Add a text selection to an infographic.
 * Returns the new selection and optional warning message.
 */
export function useAddSelection(infographicId: string) {
  const queryClient = useQueryClient();
  const queryKey = getInfographicQueryKey(infographicId);

  return useMutation<AddSelectionResult, Error, AddSelectionInput>({
    mutationFn: addSelectionMutationFn,

    onSuccess: (data) => {
      // Update cache with new selection
      queryClient.setQueryData<Infographic>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          selections: [...current.selections, data.selection],
        };
      });

      // Show warning if over soft limit
      if (data.warningMessage) {
        toast.warning(data.warningMessage);
      }
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to add selection'));
    },
  });
}

// -----------------------------------------------------------------------------
// Remove Selection
// -----------------------------------------------------------------------------

interface RemoveSelectionInput {
  id: string;
  selectionId: string;
}

interface MutationContext {
  previous: Infographic | undefined;
}

/**
 * Remove a selection from an infographic.
 * Uses optimistic update for instant UI feedback.
 */
export function useRemoveSelection(infographicId: string) {
  const queryClient = useQueryClient();
  const queryKey = getInfographicQueryKey(infographicId);

  return useMutation<
    Record<string, never>,
    Error,
    RemoveSelectionInput,
    MutationContext
  >({
    mutationFn: removeSelectionMutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Infographic>(queryKey);

      if (previous) {
        queryClient.setQueryData<Infographic>(queryKey, {
          ...previous,
          selections: previous.selections.filter(
            (s) => s.id !== variables.selectionId,
          ),
        });
      }

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(error, 'Failed to remove selection'));
    },
  });
}

// -----------------------------------------------------------------------------
// Update Selection
// -----------------------------------------------------------------------------

interface UpdateSelectionInput {
  id: string;
  selectionId: string;
  selectedText?: string;
}

type UpdateSelectionResult = RouterOutput['infographics']['updateSelection'];

/**
 * Update a selection's text.
 * Uses optimistic update for instant UI feedback.
 */
export function useUpdateSelection(infographicId: string) {
  const queryClient = useQueryClient();
  const queryKey = getInfographicQueryKey(infographicId);

  return useMutation<
    UpdateSelectionResult,
    Error,
    UpdateSelectionInput,
    MutationContext
  >({
    mutationFn: updateSelectionMutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Infographic>(queryKey);

      if (previous && variables.selectedText !== undefined) {
        queryClient.setQueryData<Infographic>(queryKey, {
          ...previous,
          selections: previous.selections.map((s) =>
            s.id === variables.selectionId
              ? { ...s, selectedText: variables.selectedText! }
              : s,
          ),
        });
      }

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(error, 'Failed to update selection'));
    },

    onSuccess: (data) => {
      // Update cache with server response to ensure consistency
      queryClient.setQueryData<Infographic>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          selections: current.selections.map((s) =>
            s.id === data.selection.id ? data.selection : s,
          ),
        };
      });
    },
  });
}

// -----------------------------------------------------------------------------
// Reorder Selections
// -----------------------------------------------------------------------------

interface ReorderSelectionsInput {
  id: string;
  orderedSelectionIds: Selection['id'][];
}

type ReorderSelectionsResult =
  RouterOutput['infographics']['reorderSelections'];

/**
 * Reorder selections by providing new order.
 * Uses optimistic update for instant UI feedback.
 */
export function useReorderSelections(infographicId: string) {
  const queryClient = useQueryClient();
  const queryKey = getInfographicQueryKey(infographicId);

  return useMutation<
    ReorderSelectionsResult,
    Error,
    ReorderSelectionsInput,
    MutationContext
  >({
    mutationFn: reorderSelectionsMutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Infographic>(queryKey);

      if (previous) {
        const selectionMap = new Map(
          previous.selections.map((s) => [s.id, s]),
        );
        const reorderedSelections = variables.orderedSelectionIds
          .map((id, index) => {
            const selection = selectionMap.get(id);
            if (!selection) return null;
            return { ...selection, orderIndex: index };
          })
          .filter((s): s is Selection => s !== null);

        queryClient.setQueryData<Infographic>(queryKey, {
          ...previous,
          selections: reorderedSelections,
        });
      }

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(error, 'Failed to reorder selections'));
    },

    onSuccess: (data) => {
      // Update cache with server response to ensure consistency
      queryClient.setQueryData<Infographic>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          selections: data.selections,
        };
      });
    },
  });
}
