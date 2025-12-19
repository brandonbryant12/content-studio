import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { PodcastItem } from './-components/podcast-item';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';

export const Route = createFileRoute('/_protected/podcasts/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.podcasts.list.queryOptions({ input: {} }),
    ),
  component: PodcastsPage,
});

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
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
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        {hasSearch ? 'No podcasts found' : 'No podcasts yet'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-4">
        {hasSearch
          ? 'Try adjusting your search query.'
          : 'Create your first podcast from a document to get started.'}
      </p>
      {!hasSearch && (
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-medium shadow-md"
        >
          <PlusIcon className="w-4 h-4" />
          Create Podcast
        </Link>
      )}
    </div>
  );
}

function PodcastsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: podcasts, isPending } = useQuery(
    apiClient.podcasts.list.queryOptions({ input: {} }),
  );

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateQueries('podcasts');
        toast.success('Podcast deleted');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete podcast');
      },
    }),
  );

  const filteredPodcasts = podcasts?.filter((podcast) =>
    podcast.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Podcasts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your generated podcasts and voice overs
          </p>
        </div>
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-medium shadow-md shadow-violet-500/20"
        >
          <PlusIcon className="w-4 h-4" />
          Create New
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search podcasts..."
          className="pl-10 h-11 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-950 transition-colors"
        />
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Content */}
      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6" />
        </div>
      ) : filteredPodcasts?.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery} />
      ) : (
        <div className="space-y-3">
          {filteredPodcasts?.map((podcast) => (
            <PodcastItem
              key={podcast.id}
              podcast={podcast}
              onDelete={() => deleteMutation.mutate({ id: podcast.id })}
              isDeleting={
                deleteMutation.isPending &&
                deleteMutation.variables?.id === podcast.id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
