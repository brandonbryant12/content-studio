// Presenter: Pure UI component for document card

import { TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback } from 'react';
import { getFileBadgeClass, getFileLabel } from '../lib/format';
import { DocumentIcon } from './document-icon';
import { formatFileSize } from '@/shared/lib/formatters';

/** Document data for list display */
export interface DocumentListItem {
  id: string;
  title: string;
  source: string;
  status: string;
  wordCount: number;
  originalFileSize: number | null;
  sourceUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface DocumentItemProps {
  document: DocumentListItem;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  hideDelete?: boolean;
}

// Memoized to prevent re-renders when parent list re-renders (rerender-memo)
export const DocumentItem = memo(function DocumentItem({
  document,
  onDelete,
  isDeleting,
  hideDelete,
}: DocumentItemProps) {
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete?.(document.id);
    },
    [onDelete, document.id],
  );

  return (
    <div className="content-card group">
      <Link
        to="/documents/$documentId"
        params={{ documentId: document.id }}
        className="flex flex-col flex-1"
      >
        <div className="content-card-thumb">
          <DocumentIcon source={document.source} />
        </div>
        <div className="content-card-body">
          <h3 className="content-card-title">{document.title}</h3>
          <div className="content-card-meta">
            <span className={getFileBadgeClass(document.source)}>
              {getFileLabel(document.source)}
            </span>
            <span className="text-meta">
              {document.wordCount.toLocaleString()} words
            </span>
          </div>
        </div>
      </Link>
      <div className="content-card-footer">
        <div className="flex items-center gap-2">
          <span className="text-meta">
            {formatFileSize(document.originalFileSize)}
          </span>
          <span className="text-meta">
            {new Date(document.createdAt).toLocaleDateString()}
          </span>
        </div>
        {!hideDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="content-card-delete h-7 w-7"
            aria-label={`Delete ${document.title}`}
          >
            {isDeleting ? (
              <Spinner className="w-3.5 h-3.5" />
            ) : (
              <TrashIcon className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
});
