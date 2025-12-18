import { TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import {
  type PodcastStatus,
  getStatusConfig,
  isGeneratingStatus,
} from '../-constants/status';
import { PodcastIcon } from './podcast-icon';
import { formatDuration } from '@/lib/formatters';

function StatusBadge({ status }: { status: PodcastStatus }) {
  const config = getStatusConfig(status);

  return (
    <Badge variant={config.badgeVariant} className="gap-1.5 px-2.5 py-1">
      {isGeneratingStatus(status) && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

function FormatBadge({ format }: { format: 'voice_over' | 'conversation' }) {
  return (
    <Badge variant="default" className="px-2.5 py-1">
      {format === 'conversation' ? 'Podcast' : 'Voice Over'}
    </Badge>
  );
}

export function PodcastItem({
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
        to="/projects/$projectId/$mediaType/$mediaId"
        params={{ projectId: podcast.projectId, mediaType: 'podcast', mediaId: podcast.id }}
        search={{ docs: '' }}
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
