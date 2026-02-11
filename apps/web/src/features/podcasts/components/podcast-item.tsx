import { PauseIcon, PlayIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useState } from 'react';
import type { UseQuickPlayReturn } from '@/shared/hooks/use-quick-play';
import {
  type VersionStatus,
  getStatusConfig,
  isGeneratingStatus,
} from '../lib/status';
import { PodcastIcon } from './podcast-icon';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { formatDuration } from '@/shared/lib/formatters';
import { getStorageUrl } from '@/shared/lib/storage-url';

/** Podcast data for list display */
export interface PodcastListItem {
  id: string;
  title: string;
  description: string | null;
  format: 'voice_over' | 'conversation';
  audioUrl: string | null;
  createdAt: string;
  status: VersionStatus;
  duration: number | null;
  coverImageStorageKey: string | null;
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
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  hideDelete?: boolean;
  quickPlay?: UseQuickPlayReturn;
  isSelected?: boolean;
  hasSelection?: boolean;
  onToggleSelect?: (id: string) => void;
}

// Memoized to prevent re-renders when parent list re-renders (rerender-memo)
export const PodcastItem = memo(function PodcastItem({
  podcast,
  onDelete,
  isDeleting,
  hideDelete,
  quickPlay,
  isSelected,
  hasSelection,
  onToggleSelect,
}: PodcastItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setConfirmOpen(false);
    onDelete?.(podcast.id);
  }, [onDelete, podcast.id]);

  const hasAudio = !!podcast.audioUrl;
  const isThisPlaying =
    quickPlay?.playingId === podcast.id && quickPlay.isPlaying;

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!podcast.audioUrl || !quickPlay) return;
      quickPlay.toggle(podcast.id, podcast.audioUrl);
    },
    [quickPlay, podcast.id, podcast.audioUrl],
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect?.(podcast.id);
    },
    [onToggleSelect, podcast.id],
  );

  return (
    <>
      <div
        className="content-card group"
        data-selected={isSelected || undefined}
      >
        <Link
          to="/podcasts/$podcastId"
          params={{ podcastId: podcast.id }}
          search={{ version: undefined }}
          className="flex flex-col flex-1"
        >
          <div className="content-card-thumb">
            {onToggleSelect && (
              <div
                className="content-card-checkbox"
                data-visible={hasSelection || isSelected || undefined}
                onClick={handleCheckboxClick}
              >
                <Checkbox
                  checked={isSelected}
                  tabIndex={-1}
                  aria-label={`Select ${podcast.title}`}
                />
              </div>
            )}
            {podcast.coverImageStorageKey ? (
              <img
                src={getStorageUrl(podcast.coverImageStorageKey)}
                alt={`${podcast.title} cover`}
                loading="lazy"
              />
            ) : (
              <PodcastIcon format={podcast.format} status={podcast.status} />
            )}
            {isGeneratingStatus(podcast.status) && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                <Spinner className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
          <div className="content-card-body">
            <h3 className="content-card-title">{podcast.title}</h3>
            <div className="content-card-meta">
              <StatusBadge status={podcast.status} />
              <FormatBadge format={podcast.format} />
            </div>
            {podcast.description && (
              <p className="content-card-description">{podcast.description}</p>
            )}
          </div>
        </Link>
        <div className="content-card-footer">
          <div className="flex items-center gap-2">
            {quickPlay && hasAudio && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={handlePlayClick}
                aria-label={
                  isThisPlaying
                    ? `Pause ${podcast.title}`
                    : `Play ${podcast.title}`
                }
              >
                {isThisPlaying ? (
                  <PauseIcon className="w-3.5 h-3.5" />
                ) : (
                  <PlayIcon className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
            {quickPlay?.playingId === podcast.id ? (
              <span className="text-meta tabular-nums">
                {quickPlay.formatTime(quickPlay.currentTime)}
                {quickPlay.duration > 0 &&
                  ` / ${quickPlay.formatTime(quickPlay.duration)}`}
              </span>
            ) : (
              podcast.duration && (
                <span className="text-meta">
                  {formatDuration(podcast.duration)}
                </span>
              )
            )}
            <span className="text-meta">
              {new Date(podcast.createdAt).toLocaleDateString()}
            </span>
          </div>
          {!hideDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="content-card-delete h-7 w-7"
              aria-label={`Delete ${podcast.title}`}
            >
              {isDeleting ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <TrashIcon className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Podcast"
        description="Are you sure you want to delete this podcast? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
});
