import { PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import type { SourceInfo } from '@/shared/hooks/use-source-selection';

interface SourceListProps {
  sources: SourceInfo[];
  disabled?: boolean;
  onRemove: (sourceId: string) => void;
  onAdd?: () => void;
}

export function SourceList({
  sources,
  disabled,
  onRemove,
  onAdd,
}: SourceListProps) {
  return (
    <div className="doc-manager-list">
      {sources.map((source) => (
        <div key={source.id} className="doc-manager-item group">
          <div className="doc-manager-item-icon">
            <span>
              {source.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) ||
                'DOC'}
            </span>
          </div>
          <div className="doc-manager-item-info">
            <p className="doc-manager-item-title">{source.title}</p>
            <p className="doc-manager-item-meta">
              {source.wordCount.toLocaleString()} words
            </p>
          </div>
          {!disabled && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRemove(source.id)}
              className="doc-manager-item-remove"
              aria-label={`Remove ${source.title}`}
            >
              <Cross2Icon className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}

      {!disabled && onAdd && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="doc-manager-add-btn"
        >
          <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
          Add source
        </Button>
      )}
    </div>
  );
}
