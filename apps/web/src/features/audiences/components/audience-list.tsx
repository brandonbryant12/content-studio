import { useCallback, useMemo, useTransition, type ChangeEvent } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { AudienceItem, type AudienceSegmentListItem } from './audience-item';

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
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No audience segments yet</h3>
      <p className="empty-state-description">
        Define target audiences to tailor your podcast content and messaging
        tone.
      </p>
      <Button onClick={onCreateClick}>
        <PlusIcon className="w-4 h-4 mr-2" />
        Create Segment
      </Button>
    </div>
  );
}

function NoResults({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        No audience segments found matching &quot;{searchQuery}&quot;
      </p>
    </div>
  );
}

export interface AudienceListProps {
  segments: readonly AudienceSegmentListItem[];
  searchQuery: string;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onEdit: (segment: AudienceSegmentListItem) => void;
  onDelete: (id: string) => void;
}

export function AudienceList({
  segments,
  searchQuery,
  deletingId,
  onSearch,
  onCreate,
  onEdit,
  onDelete,
}: AudienceListProps) {
  const [isPending, startTransition] = useTransition();

  const filteredSegments = useMemo(
    () =>
      segments.filter((segment) =>
        segment.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [segments, searchQuery],
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

  const isEmpty = segments.length === 0;
  const hasNoResults =
    filteredSegments.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Target Listeners</p>
          <h1 className="page-title">Audiences</h1>
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
            placeholder="Search audience segments..."
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
          {filteredSegments.map((segment) => (
            <AudienceItem
              key={segment.id}
              segment={segment}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={deletingId === segment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
