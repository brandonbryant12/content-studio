import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon, Pencil1Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import type { ScriptSegment } from '@/hooks/use-script-editor';

interface SegmentItemProps {
  segment: ScriptSegment;
  lineNumber: number;
  onEdit: () => void;
  onRemove: () => void;
  onAddAfter: () => void;
}

export function SegmentItem({ segment, lineNumber, onEdit, onRemove, onAddAfter }: SegmentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: segment.index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isHost = segment.speaker.toLowerCase() === 'host';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group segment-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* Line indicator */}
      <div className="segment-item-indicator" />

      {/* Line number */}
      <div className="segment-item-line-number">
        <span>{lineNumber}</span>
      </div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="segment-item-drag-handle"
        aria-label="Drag to reorder"
      >
        <DragHandleDots2Icon />
      </button>

      {/* Speaker badge */}
      <div className="segment-item-speaker">
        <span className={`segment-item-speaker-badge ${isHost ? 'host' : 'guest'}`}>
          {segment.speaker}
        </span>
      </div>

      {/* Line content */}
      <p className="segment-item-content">
        {segment.line || <span className="segment-item-empty">Empty line...</span>}
      </p>

      {/* Actions */}
      <div className="segment-item-actions">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddAfter}
          className="segment-action-btn add"
          aria-label="Add segment after"
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="segment-action-btn edit"
          aria-label="Edit segment"
        >
          <Pencil1Icon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="segment-action-btn delete"
          aria-label="Remove segment"
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
