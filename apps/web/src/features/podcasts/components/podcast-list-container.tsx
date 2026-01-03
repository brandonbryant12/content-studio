// features/podcasts/components/podcast-list-container.tsx
// Container: Handles data fetching, state management, and mutations

import { useState, useCallback } from 'react';
import { usePodcastList } from '../hooks/use-podcast-list';
import { useOptimisticCreate } from '../hooks/use-optimistic-create';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import { PodcastList } from './podcast-list';

/**
 * Container: Fetches podcast list and coordinates mutations.
 * Manages search state locally.
 */
export function PodcastListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Data fetching
  const { data: podcasts = [], isLoading } = usePodcastList();

  // Mutations
  const createMutation = useOptimisticCreate();
  const deleteMutation = useOptimisticDeleteList();

  const handleCreate = useCallback(() => {
    createMutation.mutate({
      title: 'Untitled Podcast',
      format: 'conversation',
    });
  }, [createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
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
    [deleteMutation],
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Show loading state while initially fetching
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
    />
  );
}
