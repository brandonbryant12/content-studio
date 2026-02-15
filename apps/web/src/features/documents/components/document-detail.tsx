// Presenter: Pure UI for document detail view

import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useMemo, useState, type ReactNode } from 'react';
import type { UseDocumentSearchReturn } from '../hooks/use-document-search';
import type { RouterOutput } from '@repo/api/client';
import { getFileBadgeClass, getFileLabel } from '../lib/format';
import { DocumentIcon } from './document-icon';
import { formatDate, formatFileSize } from '@/shared/lib/formatters';

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function SourceFavicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <svg
        className="w-3.5 h-3.5 text-muted-foreground"
        viewBox="0 0 15 15"
        fill="currentColor"
      >
        <path d="M7.5 0a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM1.197 7.5a6.303 6.303 0 1 1 12.606 0 6.303 6.303 0 0 1-12.606 0Z" />
      </svg>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      width={14}
      height={14}
      className="rounded-sm"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

interface ResearchCalloutProps {
  config: NonNullable<Document['researchConfig']>;
}

function ResearchCallout({ config }: ResearchCalloutProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sources = config.sources ?? [];
  const sourceCount = sources.length || config.sourceCount || 0;

  return (
    <div className="research-callout mb-8">
      {/* Topic header */}
      <div className="research-callout-header">
        <div className="research-callout-icon" aria-hidden="true">
          <MagnifyingGlassIcon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="research-callout-label">Research topic</span>
          <p className="research-callout-query">{config.query}</p>
        </div>
      </div>

      {/* Sources toggle + panel */}
      {sourceCount > 0 && (
        <div className="research-sources-section">
          <button
            type="button"
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="research-sources-toggle"
            aria-expanded={sourcesOpen}
          >
            <span className="research-sources-count">
              {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
            </span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${sourcesOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {sourcesOpen && sources.length > 0 && (
            <ul className="research-sources-list" role="list">
              {sources.map((source, i) => (
                <li
                  key={source.url}
                  className="research-source-item"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="research-source-link"
                  >
                    <span
                      className="research-source-favicon"
                      aria-hidden="true"
                    >
                      <SourceFavicon domain={extractDomain(source.url)} />
                    </span>
                    <span className="research-source-info">
                      <span className="research-source-title">
                        {source.title}
                      </span>
                      <span className="research-source-domain">
                        {extractDomain(source.url)}
                      </span>
                    </span>
                    <svg
                      className="research-source-arrow"
                      viewBox="0 0 15 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 2.5h9v9M12 3 3.5 11.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type Document = RouterOutput['documents']['get'];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface SearchMatch {
  paragraphIndex: number;
  start: number;
  length: number;
}

interface ParagraphMatch extends SearchMatch {
  globalIndex: number;
}

/** Splits paragraph text into fragments with highlighted matches */
function highlightParagraph(
  text: string,
  paragraphMatches: readonly ParagraphMatch[] | undefined,
  currentMatchIndex: number,
): ReactNode[] {
  if (!paragraphMatches || paragraphMatches.length === 0) return [text];

  const fragments: ReactNode[] = [];
  let cursor = 0;

  for (const match of paragraphMatches) {
    if (match.start > cursor) {
      fragments.push(text.slice(cursor, match.start));
    }
    const isCurrent = match.globalIndex === currentMatchIndex;
    fragments.push(
      <mark
        key={`${match.globalIndex}-${match.start}-${match.length}`}
        className={
          isCurrent
            ? 'bg-primary/30 text-foreground rounded-sm ring-2 ring-primary'
            : 'bg-yellow-200/60 dark:bg-yellow-500/30 text-foreground rounded-sm'
        }
        data-search-current={isCurrent ? 'true' : undefined}
      >
        {text.slice(match.start, match.start + match.length)}
      </mark>,
    );
    cursor = match.start + match.length;
  }

  if (cursor < text.length) {
    fragments.push(text.slice(cursor));
  }

  return fragments;
}

const SearchBar = memo(function SearchBar({
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

export interface DocumentDetailProps {
  document: Document;
  content: string | null;
  title: string;
  onTitleChange: (title: string) => void;
  hasChanges: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isRetrying: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onDeleteRequest: () => void;
  onRetry: () => void;
  search: UseDocumentSearchReturn;
}

export function DocumentDetail({
  document,
  content,
  title,
  onTitleChange,
  hasChanges,
  isSaving,
  isDeleting,
  isRetrying,
  onSave,
  onDiscard,
  onDeleteRequest,
  onRetry,
  search,
}: DocumentDetailProps) {
  const paragraphs = useMemo(
    () => (content ? content.split('\n') : []),
    [content],
  );

  const matchesByParagraph = useMemo(() => {
    const grouped = new Map<number, ParagraphMatch[]>();
    search.matches.forEach((match, globalIndex) => {
      const list = grouped.get(match.paragraphIndex);
      const withGlobalIndex = { ...match, globalIndex };
      if (list) {
        list.push(withGlobalIndex);
      } else {
        grouped.set(match.paragraphIndex, [withGlobalIndex]);
      }
    });
    return grouped;
  }, [search.matches]);

  return (
    <div className="workbench">
      {/* Header */}
      <header className="workbench-header">
        <div className="workbench-header-content">
          <div className="workbench-header-row">
            {/* Back button */}
            <Link
              to="/documents"
              className="workbench-back-btn"
              aria-label="Back to documents"
            >
              <ArrowLeftIcon />
            </Link>

            {/* Document icon and title */}
            <div className="workbench-title-group">
              <DocumentIcon source={document.source} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="workbench-title-input"
                    aria-label="Document title"
                  />
                  {hasChanges && (
                    <Pencil1Icon
                      className="w-3.5 h-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="workbench-meta">
              <div className="workbench-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={search.isOpen ? search.close : search.open}
                  className={search.isOpen ? 'text-primary' : ''}
                  aria-label="Search in document"
                  aria-pressed={search.isOpen}
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDeleteRequest}
                  disabled={isDeleting}
                  className="workbench-delete-btn"
                  aria-label={`Delete ${document.title}`}
                >
                  {isDeleting ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search bar */}
      <SearchBar search={search} />

      {/* Main content */}
      <div className="workbench-main">
        <div className="workbench-scroll-container">
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-3 mb-8 text-sm">
              <span className={getFileBadgeClass(document.source)}>
                {getFileLabel(document.source)}
              </span>
              {document.status === 'ready' && (
                <span className="text-muted-foreground">
                  {document.wordCount.toLocaleString()} words
                </span>
              )}
              {document.originalFileSize && (
                <>
                  <span className="text-border" aria-hidden="true">
                    |
                  </span>
                  <span className="text-muted-foreground">
                    {formatFileSize(document.originalFileSize)}
                  </span>
                </>
              )}
              {document.originalFileName && (
                <>
                  <span className="text-border" aria-hidden="true">
                    |
                  </span>
                  <span
                    className="text-muted-foreground truncate max-w-[200px]"
                    title={document.originalFileName}
                  >
                    {document.originalFileName}
                  </span>
                </>
              )}
              <span className="text-border" aria-hidden="true">
                |
              </span>
              <span
                className="text-muted-foreground"
                title={`Created: ${formatDateTime(document.createdAt)}`}
              >
                {formatDate(document.createdAt)}
              </span>
              {document.updatedAt !== document.createdAt && (
                <span
                  className="text-muted-foreground italic"
                  title={`Updated: ${formatDateTime(document.updatedAt)}`}
                >
                  (edited)
                </span>
              )}
            </div>

            {/* Source info callout */}
            {document.source === 'url' && document.sourceUrl && (
              <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <span className="text-muted-foreground">Scraped from </span>
                <a
                  href={document.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {document.sourceUrl}
                </a>
                <span className="text-muted-foreground">
                  {' '}
                  on {formatDate(document.createdAt)}
                </span>
              </div>
            )}
            {document.source === 'research' && document.researchConfig && (
              <ResearchCallout config={document.researchConfig} />
            )}

            {/* Processing state */}
            {document.status === 'processing' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Spinner className="w-8 h-8" />
                <p className="text-muted-foreground text-sm">
                  {document.source === 'research'
                    ? 'Researching — this may take a few minutes...'
                    : 'Processing content...'}
                </p>
              </div>
            )}

            {/* Failed state */}
            {document.status === 'failed' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <p className="text-muted-foreground text-sm text-center max-w-md">
                  {document.errorMessage || 'Processing failed'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <Spinner className="w-3.5 h-3.5 mr-2" />
                      Retrying...
                    </>
                  ) : (
                    'Retry'
                  )}
                </Button>
              </div>
            )}

            {/* Document content */}
            {document.status === 'ready' && (
              <article className="document-content-reader">
                {content ? (
                  paragraphs.map((paragraph, i) =>
                    paragraph.trim() === '' ? (
                      <br key={i} />
                    ) : (
                      <p key={i}>
                        {search.query.length >= 2 && search.matches.length > 0
                          ? highlightParagraph(
                              paragraph,
                              matchesByParagraph.get(i),
                              search.currentMatchIndex,
                            )
                          : paragraph}
                      </p>
                    ),
                  )
                ) : (
                  <p className="text-muted-foreground italic">
                    No content available for this document.
                  </p>
                )}
              </article>
            )}
          </div>
        </div>
      </div>

      {/* Action bar - only visible when there are changes */}
      {hasChanges && (
        <div className="workbench-action-bar">
          <div className="flex items-center justify-between w-full px-6">
            <span className="text-sm text-muted-foreground">
              Unsaved title changes
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onDiscard}
                disabled={isSaving}
                type="button"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving || !title.trim()}
                type="button"
              >
                {isSaving ? (
                  <>
                    <Spinner className="w-3.5 h-3.5 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
