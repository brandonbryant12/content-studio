// features/voiceovers/components/voiceover-list.tsx
// Presenter: Pure UI component with no data fetching or state management

import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { VoiceoverItem, type VoiceoverListItem } from './voiceover-item';

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
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No voiceovers yet</h3>
      <p className="empty-state-description">
        Create your first voiceover to get started.
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
            Create Voiceover
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
        No voiceovers found matching "{searchQuery}"
      </p>
    </div>
  );
}

export interface VoiceoverListProps {
  voiceovers: readonly VoiceoverListItem[];
  searchQuery: string;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function VoiceoverList({
  voiceovers,
  searchQuery,
  isCreating,
  deletingId,
  onSearch,
  onCreate,
  onDelete,
}: VoiceoverListProps) {
  const filteredVoiceovers = voiceovers.filter((voiceover) =>
    voiceover.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isEmpty = voiceovers.length === 0;
  const hasNoResults =
    filteredVoiceovers.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Audio Content</p>
          <h1 className="page-title">Voiceovers</h1>
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
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search voiceovers..."
          className="search-input"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyState onCreateClick={onCreate} isCreating={isCreating} />
      ) : hasNoResults ? (
        <NoResults searchQuery={searchQuery} />
      ) : (
        <div className="space-y-2">
          {filteredVoiceovers.map((voiceover) => (
            <VoiceoverItem
              key={voiceover.id}
              voiceover={voiceover}
              onDelete={() => onDelete(voiceover.id)}
              isDeleting={deletingId === voiceover.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
