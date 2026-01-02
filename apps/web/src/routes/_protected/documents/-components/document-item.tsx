import { TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { DocumentIcon } from './document-icon';
import { formatFileSize } from '@/shared/lib/formatters';

/** Document data for list display */
interface DocumentListItem {
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

export function DocumentItem({
  document,
  onDelete,
  isDeleting,
}: {
  document: DocumentListItem;
  onDelete: () => void;
  isDeleting: boolean;
}) {
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          className="btn-delete"
        >
          {isDeleting ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
