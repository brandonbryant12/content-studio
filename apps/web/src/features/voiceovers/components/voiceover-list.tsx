import {
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import {
  memo,
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react';
import type { VoiceoverListItem } from './voiceover-item';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import type { UseQuickPlayReturn } from '@/shared/hooks/use-quick-play';
import { StatusBadge } from './status-badge';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { formatDuration, formatDate } from '@/shared/lib/formatters';

interface EmptyStateProps {
  onCreateClick: () => void;
  isCreating: boolean;
}

function EmptyState({ onCreateClick, isCreating }: EmptyStateProps) {
  return (
    <div className="empty-state-lg">
      <div className="empty-state-icon">
        <svg
          className="w-7 h-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No voiceovers yet</h3>
      <p className="empty-state-description">
        Create your first voiceover to get started.
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
            Create Voiceover
          </>
        )}
      </Button>
    </div>
  );
}

function NoResults({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        No voiceovers found matching &ldquo;{searchQuery}&rdquo;
      </p>
    </div>
  );
}

/**
 * Playback progress display — only rendered for the actively playing row.
 * Subscribes to quickPlay time updates so other rows don't re-render.
 */
const PlaybackProgress = memo(function PlaybackProgress({
  quickPlay,
}: {
  quickPlay: UseQuickPlayReturn;
}) {
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {quickPlay.formatTime(quickPlay.currentTime)}
      {quickPlay.duration > 0 &&
        ` / ${quickPlay.formatTime(quickPlay.duration)}`}
    </span>
  );
});

const VoiceoverRow = memo(function VoiceoverRow({
  voiceover,
  onDelete,
  isDeleting,
  isThisPlaying,
  onTogglePlay,
  isSelected,
  onToggleSelect,
}: {
  voiceover: VoiceoverListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isThisPlaying: boolean;
  onTogglePlay: (id: string, audioUrl: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setConfirmOpen(false);
    onDelete(voiceover.id);
  }, [onDelete, voiceover.id]);

  const hasAudio = !!voiceover.audioUrl;

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!voiceover.audioUrl) return;
      onTogglePlay(voiceover.id, voiceover.audioUrl);
    },
    [onTogglePlay, voiceover.id, voiceover.audioUrl],
  );

  const handleToggle = useCallback(() => {
    onToggleSelect(voiceover.id);
  }, [onToggleSelect, voiceover.id]);

  return (
    <tr
      className={`group border-b border-border last:border-b-0 transition-colors ${
        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
      }`}
    >
      {/* Checkbox */}
      <td className="py-3 pl-4 pr-1 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggle}
          aria-label={`Select ${voiceover.title}`}
        />
      </td>
      {/* Play button */}
      <td className="py-3 pl-1 pr-1 w-10">
        {hasAudio ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handlePlayClick}
            aria-label={
              isThisPlaying
                ? `Pause ${voiceover.title}`
                : `Play ${voiceover.title}`
            }
          >
            {isThisPlaying ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <div className="h-8 w-8" />
        )}
      </td>
      {/* Title */}
      <td className="py-3 px-3">
        <Link
          to="/voiceovers/$voiceoverId"
          params={{ voiceoverId: voiceover.id }}
          className="min-w-0"
        >
          <span className="font-medium text-sm truncate block">
            {voiceover.title}
          </span>
        </Link>
      </td>
      {/* Status */}
      <td className="py-3 px-4">
        <StatusBadge status={voiceover.status} />
      </td>
      {/* Voice */}
      <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
        {voiceover.voiceName ?? '-'}
      </td>
      {/* Duration */}
      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums text-right hidden sm:table-cell">
        {formatDuration(voiceover.duration)}
      </td>
      {/* Created */}
      <td className="py-3 px-4 text-sm text-muted-foreground text-right hidden lg:table-cell">
        {formatDate(voiceover.createdAt)}
      </td>
      {/* Delete */}
      <td className="py-3 px-2 w-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={`Delete ${voiceover.title}`}
        >
          {isDeleting ? (
            <Spinner className="w-3.5 h-3.5" />
          ) : (
            <TrashIcon className="w-3.5 h-3.5" />
          )}
        </Button>
        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete Voiceover"
          description={`Are you sure you want to delete "${voiceover.title}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="destructive"
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
        />
      </td>
    </tr>
  );
});

export interface VoiceoverListProps {
  voiceovers: readonly VoiceoverListItem[];
  searchQuery: string;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  quickPlay: UseQuickPlayReturn;
  selection: UseBulkSelectionReturn;
  isBulkDeleting: boolean;
  onBulkDelete: () => void;
}

export function VoiceoverList({
  voiceovers,
  searchQuery,
  isCreating,
  deletingId,
  onSearch,
  onCreate,
  onDelete,
  quickPlay,
  selection,
  isBulkDeleting,
  onBulkDelete,
}: VoiceoverListProps) {
  const [isPending, startTransition] = useTransition();

  const filteredVoiceovers = useMemo(
    () =>
      voiceovers.filter((voiceover) =>
        voiceover.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [voiceovers, searchQuery],
  );

  const filteredIds = useMemo(
    () => filteredVoiceovers.map((v) => v.id),
    [filteredVoiceovers],
  );

  const handleSearch = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      startTransition(() => {
        onSearch(value);
      });
    },
    [onSearch],
  );

  const handleToggleAll = useCallback(() => {
    if (selection.isAllSelected(filteredIds)) {
      selection.deselectAll();
    } else {
      selection.selectAll(filteredIds);
    }
  }, [selection, filteredIds]);

  const isEmpty = voiceovers.length === 0;
  const hasNoResults =
    filteredVoiceovers.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Audio Content</p>
          <h1 className="page-title">Voiceovers</h1>
        </div>
        <Button onClick={onCreate} disabled={isCreating}>
          {isCreating ? (
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
      <div className="relative mb-4">
        <Input
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search voiceovers..."
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search voiceovers"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyState onCreateClick={onCreate} isCreating={isCreating} />
      ) : hasNoResults ? (
        <NoResults searchQuery={searchQuery} />
      ) : (
        <div
          className={`rounded-lg border border-border overflow-hidden transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2.5 pl-4 pr-1 w-10">
                  <Checkbox
                    checked={
                      selection.isIndeterminate(filteredIds)
                        ? 'indeterminate'
                        : selection.isAllSelected(filteredIds)
                    }
                    onCheckedChange={handleToggleAll}
                    aria-label="Select all voiceovers"
                  />
                </th>
                <th className="w-10">
                  <span className="sr-only">Play</span>
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Voice
                </th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Duration
                </th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Created
                </th>
                <th className="w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredVoiceovers.map((voiceover) => (
                <VoiceoverRow
                  key={voiceover.id}
                  voiceover={voiceover}
                  onDelete={onDelete}
                  isDeleting={deletingId === voiceover.id}
                  isThisPlaying={
                    quickPlay.playingId === voiceover.id && quickPlay.isPlaying
                  }
                  onTogglePlay={quickPlay.toggle}
                  isSelected={selection.isSelected(voiceover.id)}
                  onToggleSelect={selection.toggle}
                />
              ))}
            </tbody>
          </table>
          {/* Playback progress rendered outside the row loop so only active row subscribes to time */}
          {quickPlay.playingId && (
            <div className="px-4 pb-2 text-xs text-muted-foreground tabular-nums">
              <PlaybackProgress quickPlay={quickPlay} />
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={filteredVoiceovers.length}
        isAllSelected={selection.isAllSelected(filteredIds)}
        isIndeterminate={selection.isIndeterminate(filteredIds)}
        isDeleting={isBulkDeleting}
        entityName="voiceover"
        onToggleAll={handleToggleAll}
        onDeselectAll={selection.deselectAll}
        onDeleteSelected={onBulkDelete}
      />
    </div>
  );
}
