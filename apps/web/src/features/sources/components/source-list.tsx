// Presenter: Pure UI component with no data fetching or state management

import { MagnifyingGlassIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useMemo, useTransition } from 'react';
import type { SourceListItem } from './source-item';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { getFileBadgeClass, getFileLabel } from '../lib/format';
import { SourceStatus, getStatusConfig } from '../lib/status';
import { SourceEntryMenu } from './source-entry-menu';
import { SourceIcon } from './source-icon';
import { UploadSourceDialog } from './upload-source-dialog';
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

const SourceRow = memo(function SourceRow({
  source,
  onDelete,
  isDeleting,
  isSelected,
  onToggleSelect,
}: {
  source: SourceListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(source.id);
    },
    [onDelete, source.id],
  );

  const handleToggle = useCallback(() => {
    onToggleSelect(source.id);
  }, [onToggleSelect, source.id]);

  return (
    <div className={`list-row group ${isSelected ? 'list-row-selected' : ''}`}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleToggle}
        aria-label={`Select ${source.title}`}
      />
      <Link
        to="/sources/$sourceId"
        params={{ sourceId: source.id }}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <SourceIcon source={source.source} />
        <span className="list-row-title truncate">{source.title}</span>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`${getFileBadgeClass(source.source)} text-xs`}>
          {getFileLabel(source.source)}
        </span>
        <StatusBadge status={source.status} />
      </div>
      <span className="list-row-meta tabular-nums w-16 text-right hidden sm:block">
        {source.wordCount.toLocaleString()}
      </span>
      <span className="list-row-meta tabular-nums hidden md:block w-16 text-right">
        {formatFileSize(source.originalFileSize)}
      </span>
      <span className="list-row-meta hidden lg:block w-24 text-right">
        {formatDate(source.createdAt)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isDeleting}
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        aria-label={`Delete ${source.title}`}
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

interface SourceListProps {
  sources: readonly SourceListItem[];
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

export function SourceList({
  sources,
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
}: SourceListProps) {
  const [isPending, startTransition] = useTransition();

  const filteredSources = useMemo(
    () =>
      sources.filter((doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [sources, searchQuery],
  );

  const filteredIds = useMemo(
    () => filteredSources.map((d) => d.id),
    [filteredSources],
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

  const isEmpty = sources.length === 0;
  const hasNoResults = filteredSources.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Sources</p>
          <h1 className="page-title">Sources</h1>
        </div>
        <div className="flex items-center gap-2">
          <SourceEntryMenu
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
            <SourceEntryMenu
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
            {filteredSources.length}{' '}
            {filteredSources.length === 1 ? 'source' : 'sources'} found
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
              {filteredSources.length}{' '}
              {filteredSources.length === 1 ? 'source' : 'sources'}
            </span>
          </div>
          <div className="space-y-1.5" role="list" aria-label="Sources">
            {filteredSources.map((doc) => (
              <SourceRow
                key={doc.id}
                source={doc}
                onDelete={onDelete}
                isDeleting={deletingId === doc.id}
                isSelected={selection.isSelected(doc.id)}
                onToggleSelect={selection.toggle}
              />
            ))}
          </div>
        </div>
      )}

      <UploadSourceDialog open={uploadOpen} onOpenChange={onUploadOpen} />

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={filteredSources.length}
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
