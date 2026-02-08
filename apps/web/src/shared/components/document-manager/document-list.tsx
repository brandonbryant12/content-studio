import { PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import type { DocumentInfo } from '@/shared/hooks/use-document-selection';

interface DocumentListProps {
  documents: DocumentInfo[];
  disabled?: boolean;
  onRemove: (docId: string) => void;
  onAdd: () => void;
}

export function DocumentList({
  documents,
  disabled,
  onRemove,
  onAdd,
}: DocumentListProps) {
  return (
    <div className="doc-manager-list">
      {documents.map((doc) => (
        <div key={doc.id} className="doc-manager-item group">
          <div className="doc-manager-item-icon">
            <span>
              {doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) || 'DOC'}
            </span>
          </div>
          <div className="doc-manager-item-info">
            <p className="doc-manager-item-title">{doc.title}</p>
            <p className="doc-manager-item-meta">
              {doc.wordCount.toLocaleString()} words
            </p>
          </div>
          {!disabled && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRemove(doc.id)}
              className="doc-manager-item-remove"
              aria-label={`Remove ${doc.title}`}
            >
              <Cross2Icon className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}

      {!disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="doc-manager-add-btn"
        >
          <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
          Add document
        </Button>
      )}
    </div>
  );
}
