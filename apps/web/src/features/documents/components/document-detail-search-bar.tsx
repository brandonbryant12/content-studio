import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { memo } from 'react';
import type { UseDocumentSearchReturn } from '../hooks/use-document-search';

export const DocumentDetailSearchBar = memo(function DocumentDetailSearchBar({
  search,
}: {
  search: UseDocumentSearchReturn;
}) {
  // Destructure to separate the ref from render-safe values,
  // preventing the linter from flagging all property accesses as ref reads.
  const {
    isOpen,
    inputRef,
    query,
    setQuery,
    matches,
    currentMatchIndex,
    goToPrevious,
    goToNext,
    close,
  } = search;

  if (!isOpen) return null;

  return (
    <div
      className="flex items-center gap-2 px-6 py-2 border-b border-border bg-muted/50"
      role="search"
      aria-label="Search in document"
    >
      <MagnifyingGlassIcon
        className="w-4 h-4 text-muted-foreground shrink-0"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
              goToPrevious();
            } else {
              goToNext();
            }
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
        placeholder="Search in document..."
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label="Search in document"
      />
      {query.length >= 2 && (
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {matches.length > 0
            ? `${currentMatchIndex + 1} of ${matches.length}`
            : 'No matches'}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={goToPrevious}
          disabled={matches.length === 0}
          aria-label="Previous match"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={goToNext}
          disabled={matches.length === 0}
          aria-label="Next match"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={close}
        aria-label="Close search"
      >
        <Cross2Icon className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
});
