// Presenter: Pure UI component with no data fetching or state management

import {
  MagnifyingGlassIcon,
  TrashIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useMemo, useTransition } from 'react';
import type { DocumentListItem } from './document-item';
import { DocumentIcon } from './document-icon';
import { UploadDocumentDialog } from './upload-document-dialog';
import { formatFileSize } from '@/shared/lib/formatters';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';

function getFileLabel(source: string): string {
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
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
      <h3 className="empty-state-title">
        {hasSearch ? 'No documents found' : 'No documents yet'}
      </h3>
      <p className="empty-state-description">
        {hasSearch
          ? 'Try adjusting your search query.'
          : 'Upload your first document to start creating podcasts and voice overs.'}
      </p>
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
    <tr
      className={`group border-b border-border last:border-b-0 transition-colors ${
        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
      }`}
    >
      <td className="py-3 pl-4 pr-1 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggle}
          aria-label={`Select ${document.title}`}
        />
      </td>
      <td className="py-3 px-4">
        <Link
          to="/documents/$documentId"
          params={{ documentId: document.id }}
          className="flex items-center gap-3 min-w-0"
        >
          <DocumentIcon source={document.source} />
          <span className="font-medium text-sm truncate">{document.title}</span>
        </Link>
      </td>
      <td className="py-3 px-4">
        <span className={`${getFileBadgeClass(document.source)} text-xs`}>
          {getFileLabel(document.source)}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums text-right">
        {document.wordCount.toLocaleString()}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums text-right hidden sm:table-cell">
        {formatFileSize(document.originalFileSize)}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground text-right hidden md:table-cell">
        {formatDate(document.createdAt)}
      </td>
      <td className="py-3 px-2 w-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={`Delete ${document.title}`}
        >
          {isDeleting ? (
            <Spinner className="w-3.5 h-3.5" />
          ) : (
            <TrashIcon className="w-3.5 h-3.5" />
          )}
        </Button>
      </td>
    </tr>
  );
});

export interface DocumentListProps {
  documents: readonly DocumentListItem[];
  searchQuery: string;
  uploadOpen: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onUploadOpen: (open: boolean) => void;
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
          <p className="page-eyebrow">Source Content</p>
          <h1 className="page-title">Knowledge Base</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => onUploadOpen(true)}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Input
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search documents…"
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search documents"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyState hasSearch={false} />
      ) : hasNoResults ? (
        <EmptyState hasSearch={true} />
      ) : (
        <div
          className={`rounded-lg border border-border overflow-hidden transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2.5 pl-4 pr-1 w-10">
                  <Checkbox
                    checked={
                      selection.isIndeterminate(filteredIds)
                        ? 'indeterminate'
                        : selection.isAllSelected(filteredIds)
                    }
                    onCheckedChange={handleToggleAll}
                    aria-label="Select all documents"
                  />
                </th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Words
                </th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Size
                </th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Created
                </th>
                <th className="w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
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
            </tbody>
          </table>
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
        entityName="document"
        onToggleAll={handleToggleAll}
        onDeselectAll={selection.deselectAll}
        onDeleteSelected={onBulkDelete}
      />
    </div>
  );
}
