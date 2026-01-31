// features/brands/components/brand-list.tsx
// Presenter: Pure UI component with no data fetching or state management

import { useCallback, useMemo, useTransition, type ChangeEvent } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { BrandItem, type BrandListItem } from './brand-item';

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
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No brands yet</h3>
      <p className="empty-state-description">
        Create your first brand to define your identity and voice.
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
            Create Brand
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
        No brands found matching "{searchQuery}"
      </p>
    </div>
  );
}

export interface BrandListProps {
  brands: readonly BrandListItem[];
  searchQuery: string;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function BrandList({
  brands,
  searchQuery,
  isCreating,
  deletingId,
  onSearch,
  onCreate,
  onDelete,
}: BrandListProps) {
  // Use transition for non-urgent search updates
  const [isPending, startTransition] = useTransition();

  const filteredBrands = useMemo(
    () =>
      brands.filter((brand) =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [brands, searchQuery],
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

  const isEmpty = brands.length === 0;
  const hasNoResults = filteredBrands.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Brand Identity</p>
          <h1 className="page-title">Brands</h1>
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
      <div className="relative mb-6">
        <Input
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search brands…"
          className="search-input"
          autoComplete="off"
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
          className={`space-y-2 transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          {filteredBrands.map((brand) => (
            <BrandItem
              key={brand.id}
              brand={brand}
              onDelete={onDelete}
              isDeleting={deletingId === brand.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
