import { useState, useCallback } from 'react';
import { useOptimisticCreate } from '../hooks/use-optimistic-create';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import {
  usePodcastList,
  getPodcastListQueryKey,
} from '../hooks/use-podcast-list';
import { useQuickPlay } from '@/shared/hooks/use-quick-play';
import { rawApiClient } from '@/clients/apiClient';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';
import { PodcastList } from './podcast-list';

const deleteFn = (input: { id: string }) => rawApiClient.podcasts.delete(input);

export function PodcastListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: podcasts = [], isLoading } = usePodcastList();
  const createMutation = useOptimisticCreate();
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (isLoading) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Audio Content</p>
            <h1 className="page-title">Podcasts</h1>
          </div>
        </div>
        <div className="loading-center-lg">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <PodcastList
      podcasts={podcasts}
      searchQuery={searchQuery}
      isCreating={createMutation.isPending}
      deletingId={deletingId}
      onSearch={handleSearch}
      onCreate={handleCreate}
      onDelete={handleDelete}
      quickPlay={quickPlay}
      selection={selection}
      isBulkDeleting={isBulkDeleting}
      onBulkDelete={handleBulkDelete}
    />
  );
}
