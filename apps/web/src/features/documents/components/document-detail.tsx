// features/documents/components/document-detail.tsx
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
import { memo, type ReactNode } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { DocumentIcon } from './document-icon';
import { formatFileSize } from '@/shared/lib/formatters';
import type { UseDocumentSearchReturn } from '../hooks/use-document-search';

type Document = RouterOutput['documents']['get'];

function getSourceLabel(source: string): string {
  if (source === 'manual') return 'Text';
  if (source.includes('txt')) return 'TXT';
  if (source.includes('pdf')) return 'PDF';
  if (source.includes('docx')) return 'DOCX';
  if (source.includes('pptx')) return 'PPTX';
  return source;
}

function getFileBadgeClass(source: string): string {
  if (source.includes('txt')) return 'file-badge-txt';
  if (source.includes('pdf')) return 'file-badge-pdf';
  if (source.includes('docx')) return 'file-badge-docx';
  if (source.includes('pptx')) return 'file-badge-pptx';
  return 'file-badge-default';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

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

/** Splits paragraph text into fragments with highlighted matches */
function highlightParagraph(
  text: string,
  paragraphIndex: number,
  matches: readonly SearchMatch[],
  currentMatchIndex: number,
  allMatches: readonly SearchMatch[],
): ReactNode[] {
  const paraMatches = matches.filter(
    (m) => m.paragraphIndex === paragraphIndex,
  );
  if (paraMatches.length === 0) return [text];

  const fragments: ReactNode[] = [];
  let cursor = 0;

  for (const match of paraMatches) {
    if (match.start > cursor) {
      fragments.push(text.slice(cursor, match.start));
    }
    const globalIdx = allMatches.indexOf(match);
    const isCurrent = globalIdx === currentMatchIndex;
    fragments.push(
      <mark
        key={`${match.start}-${match.length}`}
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
  if (!search.isOpen) return null;

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
        ref={search.inputRef}
        type="text"
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
              search.goToPrevious();
            } else {
              search.goToNext();
            }
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            search.close();
          }
        }}
        placeholder="Search in document..."
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label="Search in document"
      />
      {search.query.length >= 2 && (
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {search.matches.length > 0
            ? `${search.currentMatchIndex + 1} of ${search.matches.length}`
            : 'No matches'}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={search.goToPrevious}
          disabled={search.matches.length === 0}
          aria-label="Previous match"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={search.goToNext}
          disabled={search.matches.length === 0}
          aria-label="Next match"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={search.close}
        aria-label="Close search"
      >
        <Cross2Icon className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
});

export interface DocumentDetailProps {
  document: Document;
  content: string;
  title: string;
  onTitleChange: (title: string) => void;
  hasChanges: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onDeleteRequest: () => void;
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
  onSave,
  onDiscard,
  onDeleteRequest,
  search,
}: DocumentDetailProps) {
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
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-3 mb-8 text-sm">
              <span className={getFileBadgeClass(document.source)}>
                {getSourceLabel(document.source)}
              </span>
              <span className="text-muted-foreground">
                {document.wordCount.toLocaleString()} words
              </span>
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

            {/* Document content */}
            <article className="document-content-reader">
              {content ? (
                content
                  .split('\n')
                  .map((paragraph, i) =>
                    paragraph.trim() === '' ? (
                      <br key={i} />
                    ) : (
                      <p key={i}>
                        {search.query.length >= 2 && search.matches.length > 0
                          ? highlightParagraph(
                              paragraph,
                              i,
                              search.matches,
                              search.currentMatchIndex,
                              search.matches,
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
