import {
  InfoCircledIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useCallback, useMemo, useTransition, type ChangeEvent } from 'react';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import type { RouterOutput } from '@repo/api/client';
import { PersonaCard } from './persona-card';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';
import { CollectionGuidancePanel } from '@/shared/components/collection-guidance-panel';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';
import {
  PERSONA_ASSIGNMENT_HELP,
  PERSONA_DEFINITION,
  PERSONA_LIST_SUPPORT,
  PERSONA_USE_CASES,
} from '@/shared/lib/persona-guidance';

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
      <h2 className="empty-state-title">No personas yet</h2>
      <p className="empty-state-description">
        Create a reusable host persona for recurring podcasts, audience-specific
        explainers, or a client voice you want to use more than once.
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
            {CREATE_ACTION_LABELS.persona}
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

interface PersonaListProps {
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
          <p className="page-eyebrow">Personas</p>
          <h1 className="page-title">Personas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {PERSONA_DEFINITION} {PERSONA_LIST_SUPPORT}
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
              {CREATE_ACTION_LABELS.persona}
            </>
          )}
        </Button>
      </div>

      <CollectionGuidancePanel
        title="What personas do"
        description={PERSONA_ASSIGNMENT_HELP}
        icon={<InfoCircledIcon className="h-4 w-4" />}
        panelClassName="mb-6 rounded-2xl border border-sky-200/60 bg-sky-50/80 p-5 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/5"
        iconClassName="mt-0.5 rounded-full bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300"
        collapsible={!isEmpty}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {PERSONA_USE_CASES.map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-xl border border-sky-200/50 bg-background/80 p-4 dark:border-sky-500/10 dark:bg-background/40"
            >
              <p className="text-sm font-medium text-foreground">
                {useCase.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </CollectionGuidancePanel>

      {/* Search */}
      {!isEmpty && (
        <div className="relative mb-4">
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search personas…"
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
        <>
          <div role="status" aria-live="polite" className="sr-only">
            {filteredPersonas.length}{' '}
            {filteredPersonas.length === 1 ? 'persona' : 'personas'} found
          </div>
          <div
            role="list"
            aria-label="Persona list"
            aria-busy={isPending}
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
        </>
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
