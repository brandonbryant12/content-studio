import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { RouterOutput } from '@repo/api/client';

type SlideDeckListItem = RouterOutput['slideDecks']['list'][number];

const STATUS_LABEL: Record<SlideDeckListItem['status'], string> = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
};

const STATUS_VARIANT: Record<
  SlideDeckListItem['status'],
  'default' | 'warning' | 'success' | 'error'
> = {
  draft: 'default',
  generating: 'warning',
  ready: 'success',
  failed: 'error',
};

interface SlideDeckListProps {
  slideDecks: readonly SlideDeckListItem[];
  isCreating: boolean;
  deletingId: string | null;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function SlideDeckList({
  slideDecks,
  isCreating,
  deletingId,
  onCreate,
  onDelete,
}: SlideDeckListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      slideDecks.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [slideDecks, query],
  );

  const isEmpty = slideDecks.length === 0;
  const hasNoResults = !isEmpty && filtered.length === 0;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Presentations</p>
          <h1 className="page-title">Slide Decks</h1>
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
              New Deck
            </>
          )}
        </Button>
      </div>

      <div className="relative mb-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search slide decks..."
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search slide decks"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {isEmpty ? (
        <div className="empty-state-lg">
          <h3 className="empty-state-title">No slide decks yet</h3>
          <p className="empty-state-description">
            Create your first deck from prompt ideas and source documents.
          </p>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Slide Deck
              </>
            )}
          </Button>
        </div>
      ) : hasNoResults ? (
        <div className="text-center py-16 text-muted-foreground">
          No slide decks found matching &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((item) => (
            <article key={item.id} className="content-card group">
              <Link
                to="/slides/$slideDeckId"
                params={{ slideDeckId: item.id }}
                className="content-card-main"
              >
                <div className="content-card-body space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="content-card-title line-clamp-2">
                      {item.title}
                    </h3>
                    <Badge variant={STATUS_VARIANT[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.slides.length} slide
                    {item.slides.length === 1 ? '' : 's'}
                    {' · '}
                    Updated{' '}
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
              <div className="content-card-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(item.id)}
                  disabled={deletingId === item.id}
                  aria-label={`Delete ${item.title}`}
                >
                  {deletingId === item.id ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
