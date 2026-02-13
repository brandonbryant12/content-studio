import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import type { RouterOutput } from '@repo/api/client';
import { useCallback, useMemo, useTransition, type ChangeEvent } from 'react';
import { PersonaCard } from './persona-card';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { BulkActionBar } from '@/shared/components/bulk-action-bar/bulk-action-bar';

type PersonaListItem = RouterOutput['personas']['list'][number];

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
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No personas yet</h3>
      <p className="empty-state-description">
        Create your first persona to give your content a unique voice and
        personality.
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
            Create Persona
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
        No personas found matching &ldquo;{searchQuery}&rdquo;
      </p>
    </div>
  );
}

export interface PersonaListProps {
  personas: readonly PersonaListItem[];
  searchQuery: string;
  isCreating: boolean;
  onSearch: (query: string) => void;
  onCreate: () => void;
  selection: UseBulkSelectionReturn;
  isBulkDeleting: boolean;
  onBulkDelete: () => void;
}

export function PersonaList({
  personas,
  searchQuery,
  isCreating,
  onSearch,
  onCreate,
  selection,
  isBulkDeleting,
  onBulkDelete,
}: PersonaListProps) {
  const [isPending, startTransition] = useTransition();

  const filteredPersonas = useMemo(
    () =>
      personas.filter(
        (persona) =>
          persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (persona.role?.toLowerCase().includes(searchQuery.toLowerCase()) ??
            false),
      ),
    [personas, searchQuery],
  );

  const filteredIds = useMemo(
    () => filteredPersonas.map((p) => p.id),
    [filteredPersonas],
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

  const isEmpty = personas.length === 0;
  const hasNoResults = filteredPersonas.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Characters</p>
          <h1 className="page-title">Personas</h1>
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
      {!isEmpty && (
        <div className="relative mb-6">
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search personas..."
            className="search-input pl-10"
            autoComplete="off"
            aria-label="Search personas"
          />
          <MagnifyingGlassIcon className="search-icon" />
        </div>
      )}

      {/* Content */}
      {isEmpty ? (
        <EmptyState onCreateClick={onCreate} isCreating={isCreating} />
      ) : hasNoResults ? (
        <NoResults searchQuery={searchQuery} />
      ) : (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          {filteredPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isSelected={selection.isSelected(persona.id)}
              onToggleSelect={selection.toggle}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={filteredPersonas.length}
        isAllSelected={selection.isAllSelected(filteredIds)}
        isIndeterminate={selection.isIndeterminate(filteredIds)}
        isDeleting={isBulkDeleting}
        entityName="persona"
        onToggleAll={handleToggleAll}
        onDeselectAll={selection.deselectAll}
        onDeleteSelected={onBulkDelete}
      />
    </div>
  );
}
