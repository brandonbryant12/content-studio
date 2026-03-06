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
import { InfographicStatus } from '../lib/status';
import {
  CreateInfographicDialog,
  type CreateInfographicPayload,
} from './create-infographic-dialog';
import { InfographicItem, type InfographicListItem } from './infographic-item';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';
import { CollectionGuidancePanel } from '@/shared/components/collection-guidance-panel';
import {
  INFOGRAPHIC_DEFINITION,
  INFOGRAPHIC_FLOW_STEPS,
  INFOGRAPHIC_LIST_SUPPORT,
} from '@/shared/lib/content-guidance';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';

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
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
      <h2 className="empty-state-title">No infographics yet</h2>
      <p className="empty-state-description">
        Create your first infographic from a prompt, then iterate on new
        versions as the visual direction sharpens.
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
            {CREATE_ACTION_LABELS.infographic}
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

interface InfographicListProps {
  infographics: readonly InfographicListItem[];
  searchQuery: string;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: (payload: CreateInfographicPayload) => void;
  onDelete: (id: string) => void;
  selection: UseBulkSelectionReturn;
  isBulkDeleting: boolean;
  onBulkDelete: () => void;
}

export function InfographicList({
  infographics,
  searchQuery,
  isCreating,
  deletingId,
  onSearch,
  onCreate,
  onDelete,
  selection,
  isBulkDeleting,
  onBulkDelete,
}: InfographicListProps) {
  const [activeTab, setActiveTab] = useState<'infographics' | 'drafts'>(
    'infographics',
  );
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const drafts = useMemo(
    () => infographics.filter((i) => i.status === InfographicStatus.DRAFT),
    [infographics],
  );
  const nonDrafts = useMemo(
    () => infographics.filter((i) => i.status !== InfographicStatus.DRAFT),
    [infographics],
  );

  const activeList = activeTab === 'drafts' ? drafts : nonDrafts;

  const filteredInfographics = useMemo(
    () =>
      activeList.filter((infographic) =>
        infographic.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [activeList, searchQuery],
  );

  const filteredIds = useMemo(
    () => filteredInfographics.map((i) => i.id),
    [filteredInfographics],
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

  const isEmpty = infographics.length === 0;
  const tabEmpty = !isEmpty && activeList.length === 0;
  const hasNoResults =
    filteredInfographics.length === 0 && (searchQuery.length > 0 || tabEmpty);
  const hasSelection = selection.selectedCount > 0;

  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Infographics</p>
          <h1 className="page-title">Infographics</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {INFOGRAPHIC_DEFINITION} {INFOGRAPHIC_LIST_SUPPORT}
          </p>
        </div>
        <Button onClick={openDialog} disabled={isCreating}>
          {isCreating ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4 mr-2" />
              {CREATE_ACTION_LABELS.infographic}
            </>
          )}
        </Button>
      </div>

      <CollectionGuidancePanel
        title="How infographics work"
        description="Infographics begin with a prompt, then improve through versioned iterations instead of one final irreversible generation."
        icon={<InfoCircledIcon className="h-4 w-4" />}
        panelClassName="mb-6 rounded-2xl border border-rose-200/60 bg-rose-50/80 p-5 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/5"
        iconClassName="mt-0.5 rounded-full bg-rose-500/10 p-2 text-rose-600 dark:text-rose-300"
        collapsible={!isEmpty}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {INFOGRAPHIC_FLOW_STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-rose-200/50 bg-background/80 p-4 dark:border-rose-500/10 dark:bg-background/40"
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
      </CollectionGuidancePanel>

      <div className="relative mb-4">
        <Input
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search infographics…"
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search infographics"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Tabs */}
      {!isEmpty && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'infographics' | 'drafts')}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="infographics">
              Infographics ({nonDrafts.length})
            </TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isEmpty ? (
        <EmptyState onCreateClick={openDialog} isCreating={isCreating} />
      ) : hasNoResults ? (
        <NoResults
          searchQuery={searchQuery}
          tabLabel={activeTab === 'drafts' ? 'drafts' : 'infographics'}
        />
      ) : (
        <div
          role="list"
          aria-label="Infographic list"
          aria-busy={isPending}
          className={`card-grid transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          <div role="status" aria-live="polite" className="sr-only">
            {filteredInfographics.length}{' '}
            {filteredInfographics.length === 1 ? 'infographic' : 'infographics'}{' '}
            found
          </div>
          {filteredInfographics.map((infographic) => (
            <InfographicItem
              key={infographic.id}
              infographic={infographic}
              onDelete={onDelete}
              isDeleting={deletingId === infographic.id}
              isSelected={selection.isSelected(infographic.id)}
              hasSelection={hasSelection}
              onToggleSelect={selection.toggle}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={filteredInfographics.length}
        isAllSelected={selection.isAllSelected(filteredIds)}
        isIndeterminate={selection.isIndeterminate(filteredIds)}
        isDeleting={isBulkDeleting}
        entityName="infographic"
        onToggleAll={handleToggleAll}
        onDeselectAll={selection.deselectAll}
        onDeleteSelected={onBulkDelete}
      />

      <CreateInfographicDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isCreating={isCreating}
        onCreate={onCreate}
      />
    </div>
  );
}
