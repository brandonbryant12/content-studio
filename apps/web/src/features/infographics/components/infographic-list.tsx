import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useCallback, useMemo, useTransition, type ChangeEvent } from 'react';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { InfographicItem, type InfographicListItem } from './infographic-item';
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
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No infographics yet</h3>
      <p className="empty-state-description">
        Create your first infographic to get started.
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
            Create Infographic
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
        No infographics found matching &ldquo;{searchQuery}&rdquo;
      </p>
    </div>
  );
}

export interface InfographicListProps {
  infographics: readonly InfographicListItem[];
  searchQuery: string;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
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
  const [isPending, startTransition] = useTransition();

  const filteredInfographics = useMemo(
    () =>
      infographics.filter((infographic) =>
        infographic.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [infographics, searchQuery],
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
  const hasNoResults =
    filteredInfographics.length === 0 && searchQuery.length > 0;
  const hasSelection = selection.selectedCount > 0;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Visual Content</p>
          <h1 className="page-title">Infographics</h1>
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

      <div className="relative mb-4">
        <Input
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search infographics..."
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search infographics"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {isEmpty ? (
        <EmptyState onCreateClick={onCreate} isCreating={isCreating} />
      ) : hasNoResults ? (
        <NoResults searchQuery={searchQuery} />
      ) : (
        <div
          className={`card-grid transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
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
    </div>
  );
}
