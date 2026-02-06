// features/documents/components/document-item.tsx
// Presenter: Pure UI component for document list item

import { TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
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
  // Stable callback - calls parent with id (rerender-memo-with-default-value)
  const handleDelete = useCallback(() => {
    onDelete?.(document.id);
  }, [onDelete, document.id]);

  return (
    <div className="list-card group">
      <DocumentIcon source={document.source} />
      <div className="flex-1 min-w-0">
        <h3 className="list-card-title">{document.title}</h3>
        <div className="list-card-meta">
          <span className={getFileBadgeClass(document.source)}>
            {getFileLabel(document.source)}
          </span>
          <span className="text-meta">
            {document.wordCount.toLocaleString()} words
          </span>
          <span className="text-meta">
            {formatFileSize(document.originalFileSize)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-meta">
          {new Date(document.createdAt).toLocaleDateString()}
        </span>
        {!hideDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-delete"
            aria-label={`Delete ${document.title}`}
          >
            {isDeleting ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
});
