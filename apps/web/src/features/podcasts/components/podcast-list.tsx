// features/podcasts/components/podcast-list.tsx
// Presenter: Pure UI component with no data fetching or state management

import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useCallback, useMemo, useTransition, type ChangeEvent } from 'react';
import { PodcastItem, type PodcastListItem } from './podcast-item';
import type { UseQuickPlayReturn } from '@/shared/hooks/use-quick-play';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';

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

function NoResults({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        No podcasts found matching &ldquo;{searchQuery}&rdquo;
      </p>
    </div>
  );
}

export interface PodcastListProps {
  podcasts: readonly PodcastListItem[];
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

export function PodcastList({
  podcasts,
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
}: PodcastListProps) {
  // Use transition for non-urgent search updates (rerender-transitions)
  const [isPending, startTransition] = useTransition();

  const filteredPodcasts = useMemo(
    () =>
      podcasts.filter((podcast) =>
        podcast.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [podcasts, searchQuery],
  );

  const filteredIds = useMemo(
    () => filteredPodcasts.map((p) => p.id),
    [filteredPodcasts],
  );

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Wrap in transition to keep input responsive during filtering
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

  const isEmpty = podcasts.length === 0;
  const hasNoResults = filteredPodcasts.length === 0 && searchQuery.length > 0;
  const hasSelection = selection.selectedCount > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Audio Content</p>
          <h1 className="page-title">Podcasts</h1>
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
          onChange={handleSearchChange}
          placeholder="Search podcasts…"
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search podcasts"
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
          className={`card-grid transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          {filteredPodcasts.map((podcast) => (
            <PodcastItem
              key={podcast.id}
              podcast={podcast}
              onDelete={onDelete}
              isDeleting={deletingId === podcast.id}
              quickPlay={quickPlay}
              isSelected={selection.isSelected(podcast.id)}
              hasSelection={hasSelection}
              onToggleSelect={selection.toggle}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={filteredPodcasts.length}
        isAllSelected={selection.isAllSelected(filteredIds)}
        isIndeterminate={selection.isIndeterminate(filteredIds)}
        isDeleting={isBulkDeleting}
        entityName="podcast"
        onToggleAll={handleToggleAll}
        onDeselectAll={selection.deselectAll}
        onDeleteSelected={onBulkDelete}
      />
    </div>
  );
}
