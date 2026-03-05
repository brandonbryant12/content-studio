import {
  CheckCircledIcon,
  InfoCircledIcon,
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
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
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
import { VoiceoverStatus } from '../lib/status';
import { StatusBadge } from './status-badge';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';
import { formatDuration, formatDate } from '@/shared/lib/formatters';
import {
  VOICEOVER_DEFINITION,
  VOICEOVER_FLOW_STEPS,
  VOICEOVER_LIST_SUPPORT,
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
      <h2 className="empty-state-title">No voiceovers yet</h2>
      <p className="empty-state-description">
        Create your first voiceover, refine the draft with AI if needed, then
        generate audio.
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
            {CREATE_ACTION_LABELS.voiceover}
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
    <>
      <div
        className={`list-row group ${isSelected ? 'list-row-selected' : ''}`}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggle}
          aria-label={`Select ${voiceover.title}`}
        />
        {hasAudio ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full shrink-0"
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
          <div className="w-8 shrink-0" />
        )}
        <Link
          to="/voiceovers/$voiceoverId"
          params={{ voiceoverId: voiceover.id }}
          className="flex-1 min-w-0"
        >
          <span className="list-row-title block truncate">
            {voiceover.title}
          </span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={voiceover.status} />
          {voiceover.approvedBy && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircledIcon className="w-3 h-3" />
              Approved
            </span>
          )}
        </div>
        <span className="list-row-meta hidden md:block w-20 text-right">
          {voiceover.voiceName ?? '–'}
        </span>
        <span className="list-row-meta tabular-nums hidden sm:block w-14 text-right">
          {formatDuration(voiceover.duration)}
        </span>
        <span className="list-row-meta hidden lg:block w-24 text-right">
          {formatDate(voiceover.createdAt)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={`Delete ${voiceover.title}`}
        >
          {isDeleting ? (
            <Spinner className="w-3.5 h-3.5" />
          ) : (
            <TrashIcon className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
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
    </>
  );
});

interface VoiceoverListProps {
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
  const [activeTab, setActiveTab] = useState<'voiceovers' | 'drafts'>(
    'voiceovers',
  );
  const [isPending, startTransition] = useTransition();

  const drafts = useMemo(
    () => voiceovers.filter((v) => v.status === VoiceoverStatus.DRAFTING),
    [voiceovers],
  );
  const nonDrafts = useMemo(
    () => voiceovers.filter((v) => v.status !== VoiceoverStatus.DRAFTING),
    [voiceovers],
  );

  const activeList = activeTab === 'drafts' ? drafts : nonDrafts;

  const filteredVoiceovers = useMemo(
    () =>
      activeList.filter((voiceover) =>
        voiceover.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [activeList, searchQuery],
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
  const tabEmpty = !isEmpty && activeList.length === 0;
  const hasNoResults =
    filteredVoiceovers.length === 0 && (searchQuery.length > 0 || tabEmpty);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Voiceovers</p>
          <h1 className="page-title">Voiceovers</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {VOICEOVER_DEFINITION} {VOICEOVER_LIST_SUPPORT}
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
              {CREATE_ACTION_LABELS.voiceover}
            </>
          )}
        </Button>
      </div>

      <div className="mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/80 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300">
            <InfoCircledIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              How voiceovers work
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Voiceovers start with a script. You can write it yourself or use
              AI to strengthen the draft before generating audio.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {VOICEOVER_FLOW_STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-amber-200/50 bg-background/80 p-4 dark:border-amber-500/10 dark:bg-background/40"
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
          onChange={handleSearch}
          placeholder="Search voiceovers…"
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search voiceovers"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Tabs */}
      {!isEmpty && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'voiceovers' | 'drafts')}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="voiceovers">
              Voiceovers ({nonDrafts.length})
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
          tabLabel={activeTab === 'drafts' ? 'drafts' : 'voiceovers'}
        />
      ) : (
        <div
          className={`transition-opacity ${isPending ? 'opacity-70' : ''}`}
          aria-busy={isPending}
        >
          <div role="status" aria-live="polite" className="sr-only">
            {filteredVoiceovers.length}{' '}
            {filteredVoiceovers.length === 1 ? 'voiceover' : 'voiceovers'} found
          </div>
          <div className="list-toolbar">
            <Checkbox
              checked={
                selection.isIndeterminate(filteredIds)
                  ? 'indeterminate'
                  : selection.isAllSelected(filteredIds)
              }
              onCheckedChange={handleToggleAll}
              aria-label="Select all voiceovers"
            />
            <span className="list-toolbar-count">
              {filteredVoiceovers.length}{' '}
              {filteredVoiceovers.length === 1 ? 'voiceover' : 'voiceovers'}
            </span>
          </div>
          <div className="space-y-1.5" role="list" aria-label="Voiceovers">
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
          </div>
          {quickPlay.playingId && (
            <div className="px-1 pt-3">
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
