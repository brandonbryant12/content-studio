import { useCallback, useMemo, useTransition, type ChangeEvent } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { PersonaItem, type PersonaListItem } from './persona-item';

function EmptyState({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
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
        Create host and co-host personas to give your podcasts a consistent
        voice and personality.
      </p>
      <Button onClick={onCreateClick}>
        <PlusIcon className="w-4 h-4 mr-2" />
        Create Persona
      </Button>
    </div>
  );
}

function NoResults({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        No personas found matching &quot;{searchQuery}&quot;
      </p>
    </div>
  );
}

export interface PersonaListProps {
  personas: readonly PersonaListItem[];
  searchQuery: string;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onEdit: (persona: PersonaListItem) => void;
  onDelete: (id: string) => void;
}

export function PersonaList({
  personas,
  searchQuery,
  deletingId,
  onSearch,
  onCreate,
  onEdit,
  onDelete,
}: PersonaListProps) {
  const [isPending, startTransition] = useTransition();

  const filteredPersonas = useMemo(
    () =>
      personas.filter((persona) =>
        persona.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [personas, searchQuery],
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

  const isEmpty = personas.length === 0;
  const hasNoResults =
    filteredPersonas.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Voice Identity</p>
          <h1 className="page-title">Personas</h1>
        </div>
        <Button onClick={onCreate}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Search */}
      {!isEmpty && (
        <div className="relative mb-6">
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search personas..."
            className="search-input"
            autoComplete="off"
          />
          <MagnifyingGlassIcon className="search-icon" />
        </div>
      )}

      {/* Content */}
      {isEmpty ? (
        <EmptyState onCreateClick={onCreate} />
      ) : hasNoResults ? (
        <NoResults searchQuery={searchQuery} />
      ) : (
        <div
          className={`space-y-2 transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          {filteredPersonas.map((persona) => (
            <PersonaItem
              key={persona.id}
              persona={persona}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={deletingId === persona.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
