// features/infographics/components/infographic-list.tsx
// Presenter: Pure UI component with no data fetching or state management

import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { InfographicItem, type InfographicListItem } from './infographic-item';

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
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
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
        No infographics found matching "{searchQuery}"
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
}

export function InfographicList({
  infographics,
  searchQuery,
  isCreating,
  deletingId,
  onSearch,
  onCreate,
  onDelete,
}: InfographicListProps) {
  const filteredInfographics = infographics.filter((infographic) =>
    infographic.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isEmpty = infographics.length === 0;
  const hasNoResults =
    filteredInfographics.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Search - only show if there are infographics */}
      {!isEmpty && (
        <div className="relative mb-6">
          <Input
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search infographics..."
            className="search-input"
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
        <div className="space-y-2">
          {filteredInfographics.map((infographic) => (
            <InfographicItem
              key={infographic.id}
              infographic={infographic}
              onDelete={() => onDelete(infographic.id)}
              isDeleting={deletingId === infographic.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
