import {
  ExternalLinkIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

export const Route = createFileRoute('/_protected/podcasts/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.podcasts.list.queryOptions({ input: {} }),
    ),
  component: PodcastsPage,
});

type PodcastStatus = RouterOutput['podcasts']['list'][number]['status'];

const statusConfig: Record<
  PodcastStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  generating_script: {
    label: 'Writing Script',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
  },
  script_ready: {
    label: 'Script Ready',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
  },
  generating_audio: {
    label: 'Creating Audio',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/30',
  },
  ready: {
    label: 'Ready',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
  },
};

function StatusBadge({ status }: { status: PodcastStatus }) {
  const config = statusConfig[status];
  const isGenerating =
    status === 'generating_script' || status === 'generating_audio';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color} ${config.bgColor}`}
    >
      {isGenerating && <Spinner className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

function FormatBadge({ format }: { format: 'voice_over' | 'conversation' }) {
  return (
    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">
      {format === 'conversation' ? 'Podcast' : 'Voice Over'}
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function PodcastIcon({
  format,
  status,
}: {
  format: 'voice_over' | 'conversation';
  status: PodcastStatus;
}) {
  const isReady = status === 'ready';
  const bgColor = isReady
    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
    : 'bg-gray-100 dark:bg-gray-800';
  const iconColor = isReady ? 'text-white' : 'text-gray-500 dark:text-gray-400';

  return (
    <div
      className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shadow-sm`}
    >
      {format === 'conversation' ? (
        <svg
          className={`w-6 h-6 ${iconColor}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      ) : (
        <svg
          className={`w-6 h-6 ${iconColor}`}
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
      )}
    </div>
  );
}

function PodcastItem({
  podcast,
  onDelete,
  isDeleting,
}: {
  podcast: RouterOutput['podcasts']['list'][number];
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="group border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all overflow-hidden">
      <Link
        to="/projects/$projectId"
        params={{ projectId: podcast.projectId }}
        className="flex items-start gap-4 p-4"
      >
        <PodcastIcon format={podcast.format} status={podcast.status} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {podcast.title}
          </h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={podcast.status} />
            <FormatBadge format={podcast.format} />
            {podcast.duration && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDuration(podcast.duration)}
              </span>
            )}
          </div>
          {podcast.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-1">
              {podcast.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(podcast.createdAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1 text-xs text-violet-500 dark:text-violet-400">
            <ExternalLinkIcon className="w-3 h-3" />
            View in project
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            {isDeleting ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Link>
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
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
        {hasSearch ? 'No podcasts found' : 'No podcasts yet'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-4">
        {hasSearch
          ? 'Try adjusting your search query.'
          : 'Create podcasts from within a project.'}
      </p>
      {!hasSearch && (
        <Link to="/projects">
          <Button variant="outline">Go to Projects</Button>
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
        await queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            if (!Array.isArray(key) || key.length === 0) return false;
            // oRPC uses path arrays like ['podcasts', 'list'] as the first element
            const firstKey = key[0];
            if (Array.isArray(firstKey)) {
              return firstKey[0] === 'podcasts' || firstKey[0] === 'projects';
            }
            return firstKey === 'podcasts' || firstKey === 'projects';
          },
        });
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Podcasts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View your audio content
          </p>
        </div>
        <Link to="/projects">
          <Button variant="outline">Go to Projects</Button>
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
