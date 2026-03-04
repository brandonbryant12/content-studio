import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Source = RouterOutput['sources']['get'];

interface UseSourceActionsReturn {
  /** Current edited title */
  title: string;
  /** Update the local title */
  setTitle: (title: string) => void;
  /** Whether the title has been changed from the server value */
  hasChanges: boolean;
  /** Whether the update mutation is in flight */
  isSaving: boolean;
  /** Whether the delete mutation is in flight */
  isDeleting: boolean;
  /** Save the title change */
  handleSave: () => void;
  /** Delete the source (requires confirmation first) */
  handleDelete: () => void;
  /** Discard local title changes */
  discardChanges: () => void;
}

interface UseSourceActionsOptions {
  source: Source;
}

export function useSourceActions({
  source,
}: UseSourceActionsOptions): UseSourceActionsReturn {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draftTitlesBySourceId, setDraftTitlesBySourceId] = useState<
    Record<string, string>
  >({});

  const title = draftTitlesBySourceId[source.id] ?? source.title;

  const clearDraftTitle = useCallback((sourceId: string) => {
    setDraftTitlesBySourceId((prev) => {
      if (!(sourceId in prev)) return prev;
      const { [sourceId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const setTitle = useCallback(
    (value: string) => {
      setDraftTitlesBySourceId((prev) => ({
        ...prev,
        [source.id]: value,
      }));
    },
    [source.id],
  );

  const hasChanges = title.trim() !== source.title;

  const updateMutation = useMutation(
    apiClient.sources.update.mutationOptions({
      onSuccess: (updated) => {
        toast.success('Source saved');
        clearDraftTitle(source.id);
        // Update the single-source cache
        queryClient.setQueryData(
          apiClient.sources.get.queryOptions({ input: { id: source.id } })
            .queryKey,
          updated,
        );
        // Invalidate the list so it reflects the new title
        queryClient.invalidateQueries({
          queryKey: apiClient.sources.list.queryOptions({ input: {} }).queryKey,
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update source'));
      },
    }),
  );

  const deleteMutation = useMutation(
    apiClient.sources.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Source deleted');
        navigate({ to: '/sources' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete source'));
      },
    }),
  );

  const handleSave = useCallback(() => {
    if (!hasChanges || updateMutation.isPending) return;
    updateMutation.mutate({ id: source.id, title: title.trim() });
  }, [hasChanges, updateMutation, source.id, title]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: source.id });
  }, [deleteMutation, source.id]);

  const discardChanges = useCallback(() => {
    clearDraftTitle(source.id);
  }, [clearDraftTitle, source.id]);

  return {
    title,
    setTitle,
    hasChanges,
    isSaving: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    handleSave,
    handleDelete,
    discardChanges,
  };
}
