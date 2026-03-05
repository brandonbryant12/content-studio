// Presenter: Pure UI component with no data fetching or state management

import {
  InfoCircledIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import type { UseQuickPlayReturn } from '@/shared/hooks/use-quick-play';
import { VersionStatus } from '../lib/status';
import { PodcastItem, type PodcastListItem } from './podcast-item';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';
import {
  PODCAST_DEFINITION,
  PODCAST_FLOW_STEPS,
  PODCAST_LIST_SUPPORT,
} from '@/shared/lib/content-guidance';

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
      <h2 className="empty-state-title">No podcasts yet</h2>
      <p className="empty-state-description">
        Create your first podcast from sources, then review and refine the AI
        draft before publishing.
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
            {CREATE_ACTION_LABELS.podcast}
          </>
        )}
      </Button>
    </div>
  );
}

function NoResults({
  searchQuery,
  tabLabel,
}: {
  searchQuery: string;
  tabLabel: string;
}) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        {searchQuery ? (
          <>
            No {tabLabel} found matching &ldquo;{searchQuery}&rdquo;
          </>
        ) : (
          <>No {tabLabel} yet</>
        )}
      </p>
    </div>
  );
}

interface PodcastListProps {
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
  const [activeTab, setActiveTab] = useState<'podcasts' | 'drafts'>('podcasts');
  // Use transition for non-urgent search updates (rerender-transitions)
  const [isPending, startTransition] = useTransition();

  const drafts = useMemo(
    () => podcasts.filter((p) => p.status === VersionStatus.DRAFTING),
    [podcasts],
  );
  const nonDrafts = useMemo(
    () => podcasts.filter((p) => p.status !== VersionStatus.DRAFTING),
    [podcasts],
  );

  const activeList = activeTab === 'drafts' ? drafts : nonDrafts;

  const filteredPodcasts = useMemo(
    () =>
      activeList.filter((podcast) =>
        podcast.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [activeList, searchQuery],
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
  const tabEmpty = !isEmpty && activeList.length === 0;
  const hasNoResults =
    filteredPodcasts.length === 0 && (searchQuery.length > 0 || tabEmpty);
  const hasSelection = selection.selectedCount > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Podcasts</p>
          <h1 className="page-title">Podcasts</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {PODCAST_DEFINITION} {PODCAST_LIST_SUPPORT}
          </p>
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
              {CREATE_ACTION_LABELS.podcast}
            </>
          )}
        </Button>
      </div>

      <div className="mb-6 rounded-2xl border border-sky-200/60 bg-sky-50/80 p-5 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300">
            <InfoCircledIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              How podcasts work
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Podcasts begin with sources. Personas are optional, and the first
              script draft is generated for you to review.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {PODCAST_FLOW_STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-sky-200/50 bg-background/80 p-4 dark:border-sky-500/10 dark:bg-background/40"
            >
              <p className="text-sm font-medium text-foreground">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
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

      {/* Tabs */}
      {!isEmpty && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'podcasts' | 'drafts')}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="podcasts">
              Podcasts ({nonDrafts.length})
            </TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Content */}
      {isEmpty ? (
        <EmptyState onCreateClick={onCreate} isCreating={isCreating} />
      ) : hasNoResults ? (
        <NoResults
          searchQuery={searchQuery}
          tabLabel={activeTab === 'drafts' ? 'drafts' : 'podcasts'}
        />
      ) : (
        <div
          role="list"
          aria-label="Podcast list"
          aria-busy={isPending}
          className={`card-grid transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          <div role="status" aria-live="polite" className="sr-only">
            {filteredPodcasts.length}{' '}
            {filteredPodcasts.length === 1 ? 'podcast' : 'podcasts'} found
          </div>
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
