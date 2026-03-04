// Presenter: Pure UI component with no data fetching or state management

import { MagnifyingGlassIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useMemo, useTransition } from 'react';
import type { DocumentListItem } from './document-item';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { getFileBadgeClass, getFileLabel } from '../lib/format';
import { SourceStatus, getStatusConfig } from '../lib/status';
import { DocumentEntryMenu } from './document-entry-menu';
import { DocumentIcon } from './document-icon';
import { UploadDocumentDialog } from './upload-document-dialog';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';
import { formatDate, formatFileSize } from '@/shared/lib/formatters';

function StatusBadge({ status }: { status: string }) {
  if (status === SourceStatus.READY) return null;
  const config = getStatusConfig(
    status as (typeof SourceStatus)[keyof typeof SourceStatus],
  );
  if (!config) return null;
  return (
    <Badge variant={config.badgeVariant} className="gap-1.5">
      {status === SourceStatus.PROCESSING && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

function EmptyState({
  hasSearch,
  action,
}: {
  hasSearch: boolean;
  action?: React.ReactNode;
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
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <h2 className="empty-state-title">
        {hasSearch ? 'No sources found' : 'No sources yet'}
      </h2>
      <p className="empty-state-description">
        {hasSearch
          ? 'Try adjusting your search query.'
          : 'Upload your first source to start creating podcasts, voiceovers, and infographics.'}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

const DocumentRow = memo(function DocumentRow({
  document,
  onDelete,
  isDeleting,
  isSelected,
  onToggleSelect,
}: {
  document: DocumentListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(document.id);
    },
    [onDelete, document.id],
  );

  const handleToggle = useCallback(() => {
    onToggleSelect(document.id);
  }, [onToggleSelect, document.id]);

  return (
    <div className={`list-row group ${isSelected ? 'list-row-selected' : ''}`}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleToggle}
        aria-label={`Select ${document.title}`}
      />
      <Link
        to="/documents/$documentId"
        params={{ documentId: document.id }}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <DocumentIcon source={document.source} />
        <span className="list-row-title truncate">{document.title}</span>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`${getFileBadgeClass(document.source)} text-xs`}>
          {getFileLabel(document.source)}
        </span>
        <StatusBadge status={document.status} />
      </div>
      <span className="list-row-meta tabular-nums w-16 text-right hidden sm:block">
        {document.wordCount.toLocaleString()}
      </span>
      <span className="list-row-meta tabular-nums hidden md:block w-16 text-right">
        {formatFileSize(document.originalFileSize)}
      </span>
      <span className="list-row-meta hidden lg:block w-24 text-right">
        {formatDate(document.createdAt)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isDeleting}
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        aria-label={`Delete ${document.title}`}
      >
        {isDeleting ? (
          <Spinner className="w-3.5 h-3.5" />
        ) : (
          <TrashIcon className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );
});

interface DocumentListProps {
  documents: readonly DocumentListItem[];
  searchQuery: string;
  uploadOpen: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onUploadOpen: (open: boolean) => void;
  onUrlDialogOpen: (open: boolean) => void;
  onResearchDialogOpen: (open: boolean) => void;
  onDelete: (id: string) => void;
  selection: UseBulkSelectionReturn;
  isBulkDeleting: boolean;
  onBulkDelete: () => void;
}

export function DocumentList({
  documents,
  searchQuery,
  uploadOpen,
  deletingId,
  onSearch,
  onUploadOpen,
  onUrlDialogOpen,
  onResearchDialogOpen,
  onDelete,
  selection,
  isBulkDeleting,
  onBulkDelete,
}: DocumentListProps) {
  const [isPending, startTransition] = useTransition();

  const filteredDocuments = useMemo(
    () =>
      documents.filter((doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [documents, searchQuery],
  );

  const filteredIds = useMemo(
    () => filteredDocuments.map((d) => d.id),
    [filteredDocuments],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const isEmpty = documents.length === 0;
  const hasNoResults = filteredDocuments.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Sources</p>
          <h1 className="page-title">Sources</h1>
        </div>
        <div className="flex items-center gap-2">
          <DocumentEntryMenu
            onResearch={() => onResearchDialogOpen(true)}
            onUrl={() => onUrlDialogOpen(true)}
            onUpload={() => onUploadOpen(true)}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Input
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search sources…"
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search sources"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyState
          hasSearch={false}
          action={
            <DocumentEntryMenu
              onResearch={() => onResearchDialogOpen(true)}
              onUrl={() => onUrlDialogOpen(true)}
              onUpload={() => onUploadOpen(true)}
            />
          }
        />
      ) : hasNoResults ? (
        <EmptyState hasSearch={true} />
      ) : (
        <div
          className={`transition-opacity ${isPending ? 'opacity-70' : ''}`}
          aria-busy={isPending}
        >
          <div role="status" aria-live="polite" className="sr-only">
            {filteredDocuments.length}{' '}
            {filteredDocuments.length === 1 ? 'source' : 'sources'} found
          </div>
          <div className="list-toolbar">
            <Checkbox
              checked={
                selection.isIndeterminate(filteredIds)
                  ? 'indeterminate'
                  : selection.isAllSelected(filteredIds)
              }
              onCheckedChange={handleToggleAll}
              aria-label="Select all sources"
            />
            <span className="list-toolbar-count">
              {filteredDocuments.length}{' '}
              {filteredDocuments.length === 1 ? 'source' : 'sources'}
            </span>
          </div>
          <div className="space-y-1.5" role="list" aria-label="Sources">
            {filteredDocuments.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onDelete={onDelete}
                isDeleting={deletingId === doc.id}
                isSelected={selection.isSelected(doc.id)}
                onToggleSelect={selection.toggle}
              />
            ))}
          </div>
        </div>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={onUploadOpen} />

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={filteredDocuments.length}
        isAllSelected={selection.isAllSelected(filteredIds)}
        isIndeterminate={selection.isIndeterminate(filteredIds)}
        isDeleting={isBulkDeleting}
        entityName="source"
        onToggleAll={handleToggleAll}
        onDeselectAll={selection.deselectAll}
        onDeleteSelected={onBulkDelete}
      />
    </div>
  );
}
