// features/infographics/components/workbench/selection-list.tsx

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DragHandleDots2Icon,
  TrashIcon,
  FileTextIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { SELECTION_SOFT_LIMIT } from '../../hooks/use-selections';

export interface SelectionListItem {
  id: string;
  selectedText: string;
  documentTitle: string;
  orderIndex: number;
}

export interface SelectionListProps {
  /** Selections to display */
  selections: SelectionListItem[];
  /** Callback when a selection is removed */
  onRemove: (selectionId: string) => void;
  /** Callback when selections are reordered */
  onReorder: (orderedIds: string[]) => void;
  /** Whether the list is disabled */
  disabled?: boolean;
}

/**
 * Draggable list of text selections for infographic.
 * Shows selection text, source document, and reordering handles.
 */
export function SelectionList({
  selections,
  onRemove,
  onReorder,
  disabled = false,
}: SelectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Find current positions
      const oldIndex = selections.findIndex((s) => s.id === active.id);
      const newIndex = selections.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new order
        const newSelections = [...selections];
        const moved = newSelections.splice(oldIndex, 1)[0];
        if (moved) {
          newSelections.splice(newIndex, 0, moved);
          // Emit new order of IDs
          onReorder(newSelections.map((s) => s.id));
        }
      }
    }
  };

  const sortedSelections = [...selections].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const isOverLimit = selections.length > SELECTION_SOFT_LIMIT;

  if (selections.length === 0) {
    return (
      <div className="selection-list-empty">
        <div className="selection-list-empty-icon">
          <FileTextIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">No selections yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select text from documents to add content
        </p>
      </div>
    );
  }

  return (
    <div className="selection-list">
      {/* Warning banner when over limit */}
      {isOverLimit && (
        <div className="selection-list-warning">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>
            You have {selections.length} selections. Consider removing some for
            better results.
          </span>
        </div>
      )}

      {/* Selection count */}
      <div className="selection-list-header">
        <span className="selection-list-count">
          {selections.length} selection{selections.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedSelections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="selection-list-items">
            {sortedSelections.map((selection, index) => (
              <SelectionItem
                key={selection.id}
                selection={selection}
                index={index}
                onRemove={onRemove}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SelectionItemProps {
  selection: SelectionListItem;
  index: number;
  onRemove: (selectionId: string) => void;
  disabled: boolean;
}

function SelectionItem({
  selection,
  index,
  onRemove,
  disabled,
}: SelectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: selection.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Truncate text for preview
  const previewText =
    selection.selectedText.length > 150
      ? selection.selectedText.slice(0, 150) + '...'
      : selection.selectedText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`selection-item group ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {/* Index number */}
      <div className="selection-item-index">{index + 1}</div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="selection-item-drag"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <DragHandleDots2Icon className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="selection-item-content">
        <p className="selection-item-text">{previewText}</p>
        <div className="selection-item-meta">
          <FileTextIcon className="w-3 h-3" />
          <span>{selection.documentTitle}</span>
        </div>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(selection.id)}
        className="selection-item-remove"
        aria-label="Remove selection"
        disabled={disabled}
      >
        <TrashIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}
