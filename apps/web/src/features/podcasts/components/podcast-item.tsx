// features/podcasts/components/podcast-item.tsx

import { TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { PodcastIcon } from './podcast-icon';
import {
  type VersionStatus,
  getStatusConfig,
  isGeneratingStatus,
} from '../lib/status';
import { formatDuration } from '@/shared/lib/formatters';

/** Podcast data for list display */
export interface PodcastListItem {
  id: string;
  title: string;
  description: string | null;
  format: 'voice_over' | 'conversation';
  createdAt: string;
  status: VersionStatus;
  duration: number | null;
}

function StatusBadge({ status }: { status: VersionStatus | undefined }) {
  const config = getStatusConfig(status);
  if (!config) return null;

  return (
    <Badge variant={config.badgeVariant} className="gap-1.5">
      {isGeneratingStatus(status) && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

function FormatBadge({ format }: { format: 'voice_over' | 'conversation' }) {
  return (
    <Badge variant="default">
      {format === 'conversation' ? 'Podcast' : 'Voice Over'}
    </Badge>
  );
}

export interface PodcastItemProps {
  podcast: PodcastListItem;
  onDelete: () => void;
  isDeleting: boolean;
}

export function PodcastItem({
  podcast,
  onDelete,
  isDeleting,
}: PodcastItemProps) {
  return (
    <div className="list-card group overflow-hidden">
      <Link
        to="/podcasts/$podcastId"
        params={{ podcastId: podcast.id }}
        search={{ version: undefined }}
        className="flex items-start gap-4 flex-1"
      >
        <PodcastIcon
          format={podcast.format}
          status={podcast.status}
        />
        <div className="flex-1 min-w-0">
          <h3 className="list-card-title">{podcast.title}</h3>
          <div className="list-card-meta gap-2 flex-wrap">
            <StatusBadge status={podcast.status} />
            <FormatBadge format={podcast.format} />
            {podcast.duration && (
              <span className="text-meta">
                {formatDuration(podcast.duration)}
              </span>
            )}
          </div>
          {podcast.description && (
            <p className="text-body mt-2 line-clamp-1">{podcast.description}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-meta">
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
          className="btn-delete"
        >
          {isDeleting ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
