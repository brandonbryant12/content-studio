import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { PodcastItem } from './-components/podcast-item';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { podcastCollection, podcastUtils, useLiveQuery } from '@/db';

export const Route = createFileRoute('/_protected/podcasts/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.podcasts.list.queryOptions({ input: {} }),
    ),
  component: PodcastsPage,
});

function EmptyState({
  onCreateClick,
  isCreating,
}: {
  onCreateClick: () => void;
  isCreating: boolean;
}) {
  return (
    <div className="empty-state-lg">
      <div className="empty-state-icon">
        <svg
          className="w-7 h-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No podcasts yet</h3>
      <p className="empty-state-description">
        Create your first podcast to get started.
      </p>
      <Button onClick={onCreateClick} disabled={isCreating}>
        {isCreating ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Creating...
          </>
        ) : (
          <>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Podcast
          </>
        )}
      </Button>
    </div>
  );
}

function PodcastsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Use TanStack DB live query for reactive updates
  const { data: podcasts, isLoading: isPending } = useLiveQuery((q) =>
    q.from({ podcast: podcastCollection }),
  );

  const createMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (data) => {
        navigate({
          to: '/podcasts/$podcastId',
          params: { podcastId: data.id },
          search: { version: undefined },
        });
        // Refresh the podcast collection
        await podcastUtils.refetch();
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

  // Handle podcast deletion with optimistic update
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // Optimistic delete - removes from collection immediately
      podcastCollection.delete(id);
      toast.success('Podcast deleted');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete podcast',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = () => {
    createMutation.mutate({
      title: 'Untitled Podcast',
      format: 'conversation',
    });
  };

  const filteredPodcasts = podcasts?.filter((podcast) =>
    podcast.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Audio Content</p>
          <h1 className="page-title">Podcasts</h1>
        </div>
        <Button onClick={handleCreate} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create New
            </>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search podcasts..."
          className="search-input"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Content */}
      {isPending ? (
        <div className="loading-center-lg">
          <Spinner className="w-6 h-6" />
        </div>
      ) : filteredPodcasts?.length === 0 ? (
        searchQuery ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              No podcasts found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <EmptyState
            onCreateClick={handleCreate}
            isCreating={createMutation.isPending}
          />
        )
      ) : (
        <div className="space-y-2">
          {filteredPodcasts?.map((podcast) => (
            <PodcastItem
              key={podcast.id}
              podcast={podcast}
              onDelete={() => handleDelete(podcast.id)}
              isDeleting={deletingId === podcast.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
