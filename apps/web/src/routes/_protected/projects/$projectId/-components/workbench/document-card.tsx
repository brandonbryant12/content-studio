import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckIcon,
  Cross2Icon,
  DragHandleDots2Icon,
  FileTextIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import type { Document } from './workbench-registry';

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  variant: 'source' | 'staging';
  index?: number;
  readOnly?: boolean;
}

/**
 * Checkbox component for document selection
 */
function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onCheckedChange();
      }}
      disabled={disabled}
      className={cn(
        'h-4 w-4 shrink-0 rounded-sm border transition-colors',
        checked
          ? 'bg-violet-500 border-violet-500'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {checked && <CheckIcon className="h-3.5 w-3.5 text-white" />}
    </button>
  );
}

/**
 * Document card in the source panel (draggable, with checkbox)
 */
export function SourceDocumentCard({
  document,
  isSelected,
  onToggle,
  readOnly,
}: DocumentCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-${document.id}`,
    data: { type: 'document', document },
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-lg transition-all',
        !readOnly && 'cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800',
        isSelected && 'bg-violet-50 dark:bg-violet-900/20',
        isDragging && 'opacity-50 shadow-lg',
        readOnly && 'cursor-default',
      )}
      {...(!readOnly ? { ...attributes, ...listeners } : {})}
    >
      <Checkbox
        checked={isSelected ?? false}
        onCheckedChange={onToggle ?? (() => {})}
        disabled={readOnly}
        label={`Select ${document.title}`}
      />
      <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
        <FileTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {document.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {document.wordCount.toLocaleString()} words
        </p>
      </div>
      {!readOnly && (
        <DragHandleDots2Icon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

/**
 * Document card in the staging area (sortable, with remove button)
 */
export function StagingDocumentCard({
  document,
  onRemove,
  index,
  readOnly,
}: DocumentCardProps & { index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: document.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-gray-900',
        'border-gray-200 dark:border-gray-800',
        !readOnly && 'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm',
        'transition-all',
        isDragging && 'opacity-50 shadow-lg z-50',
      )}
      {...(!readOnly ? attributes : {})}
    >
      {/* Drag handle - only in create mode */}
      {!readOnly && (
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <DragHandleDots2Icon className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Index badge */}
      <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
          {index + 1}
        </span>
      </div>

      {/* Document icon */}
      <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
        <FileTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Document info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {document.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {document.wordCount.toLocaleString()} words
        </p>
      </div>

      {/* Remove button - only in create mode */}
      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <Cross2Icon className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
