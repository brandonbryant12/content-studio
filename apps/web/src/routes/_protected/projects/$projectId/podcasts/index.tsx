import { ArrowLeftIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';
import { PodcastItem } from '@/routes/_protected/podcasts/-components/podcast-item';

export const Route = createFileRoute(
  '/_protected/projects/$projectId/podcasts/',
)({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.list.queryOptions({
        input: { projectId: params.projectId },
      }),
    ),
  component: ProjectPodcastsPage,
});

function EmptyState() {
  const { projectId } = Route.useParams();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-violet-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        No podcasts yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-4">
        Create a podcast from the project page.
      </p>
      <Link to="/projects/$projectId" params={{ projectId }}>
        <Button variant="outline">Back to Project</Button>
      </Link>
    </div>
  );
}

function ProjectPodcastsPage() {
  const { projectId } = Route.useParams();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: podcasts, isPending } = useQuery(
    apiClient.podcasts.list.queryOptions({ input: { projectId } }),
  );

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateQueries('podcasts', 'projects');
        toast.success('Podcast deleted');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete podcast');
      },
    }),
  );

  const filteredPodcasts = podcasts?.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/projects/$projectId" params={{ projectId }}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Podcasts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Audio content in this project
          </p>
        </div>
      </div>

      {/* Search */}
      {podcasts && podcasts.length > 0 && (
        <div className="relative mb-6">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search podcasts..."
            className="pl-10 h-11 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-950 transition-colors"
          />
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Content */}
      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6" />
        </div>
      ) : filteredPodcasts?.length === 0 ? (
        <EmptyState />
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
