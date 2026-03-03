import { useState, useCallback } from 'react';
import { useCreatePodcast } from '../hooks/use-create-podcast';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import {
  usePodcastList,
  getPodcastListQueryKey,
} from '../hooks/use-podcast-list';
import { PodcastList } from './podcast-list';
import { apiClient } from '@/clients/apiClient';
import {
  ListPageErrorState,
  ListPageLoadingState,
} from '@/shared/components/list-page-state';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';
import { useQuickPlay } from '@/shared/hooks/use-quick-play';

const deleteFn = apiClient.podcasts.delete.mutationOptions().mutationFn!;

export function PodcastListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: podcasts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = usePodcastList();
  const createMutation = useCreatePodcast();
  const deleteMutation = useOptimisticDeleteList();
  const quickPlay = useQuickPlay();
  const selection = useBulkSelection();
  const { executeBulkDelete, isBulkDeleting } = useBulkDelete({
    queryKey: getPodcastListQueryKey(),
    deleteFn,
    entityName: 'podcast',
  });

  const handleCreate = useCallback(() => {
    createMutation.mutate({
      title: 'Untitled Podcast',
      format: 'conversation',
    });
  }, [createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      // Stop playback if deleting the currently playing item
      if (quickPlay.playingId === id) {
        quickPlay.stop();
      }
      setDeletingId(id);
      deleteMutation.mutate(
        { id },
        {
          onSettled: () => {
            setDeletingId(null);
          },
        },
      );
    },
    [deleteMutation, quickPlay],
  );

  const handleBulkDelete = useCallback(async () => {
    quickPlay.stop();
    await executeBulkDelete(selection.selectedIds);
    selection.deselectAll();
  }, [executeBulkDelete, selection, quickPlay]);

  if (isLoading) {
    return <ListPageLoadingState title="Podcasts" />;
  }

  if (isError) {
    return (
      <ListPageErrorState
        title="Podcasts"
        error={error}
        fallbackMessage="Failed to load podcasts"
        onRetry={refetch}
      />
    );
  }

  return (
    <PodcastList
      podcasts={podcasts}
      searchQuery={searchQuery}
      isCreating={createMutation.isPending}
      deletingId={deletingId}
      onSearch={setSearchQuery}
      onCreate={handleCreate}
      onDelete={handleDelete}
      quickPlay={quickPlay}
      selection={selection}
      isBulkDeleting={isBulkDeleting}
      onBulkDelete={handleBulkDelete}
    />
  );
}
