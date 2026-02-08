// features/documents/components/document-item.tsx
// Presenter: Pure UI component for document card

import { TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { memo, useCallback } from 'react';
import { DocumentIcon } from './document-icon';
import { formatFileSize } from '@/shared/lib/formatters';

/** Document data for list display */
export interface DocumentListItem {
  id: string;
  title: string;
  source: string;
  wordCount: number;
  originalFileSize: number | null;
  createdAt: string;
}

function getFileBadgeClass(source: string): string {
  if (source.includes('txt')) return 'file-badge-txt';
  if (source.includes('pdf')) return 'file-badge-pdf';
  if (source.includes('docx')) return 'file-badge-docx';
  if (source.includes('pptx')) return 'file-badge-pptx';
  return 'file-badge-default';
}

function getFileLabel(source: string): string {
  if (source === 'manual') return 'Text';
  if (source.includes('txt')) return 'TXT';
  if (source.includes('pdf')) return 'PDF';
  if (source.includes('docx')) return 'DOCX';
  if (source.includes('pptx')) return 'PPTX';
  return source;
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
