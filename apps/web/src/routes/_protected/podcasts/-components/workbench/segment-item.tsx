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
      className={`group relative flex gap-3 p-4 rounded-xl border transition-all duration-200 ${
        isDragging
          ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 shadow-xl shadow-violet-500/10 scale-[1.02] z-10'
          : 'bg-white dark:bg-gray-900/80 border-gray-200/80 dark:border-gray-800/80 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md hover:shadow-violet-500/5'
      }`}
    >
      {/* Line number indicator */}
      <div className="absolute -left-px top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Line number */}
      <div className="shrink-0 w-6 text-right">
        <span className="text-[11px] font-mono tabular-nums text-gray-400 dark:text-gray-500 select-none">
          {lineNumber}
        </span>
      </div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
        aria-label="Drag to reorder"
      >
        <DragHandleDots2Icon className="w-5 h-5" />
      </button>

      {/* Speaker badge */}
      <div className="shrink-0 w-20 pt-0.5">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide shadow-sm ${
            isHost
              ? 'bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/60 dark:to-violet-900/30 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200/50 dark:ring-violet-700/50'
              : 'bg-gradient-to-br from-fuchsia-100 to-fuchsia-50 dark:from-fuchsia-900/60 dark:to-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 ring-1 ring-fuchsia-200/50 dark:ring-fuchsia-700/50'
          }`}
        >
          {segment.speaker}
        </span>
      </div>

      {/* Line content */}
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed min-w-0 pt-0.5">
        {segment.line || <span className="text-gray-400 dark:text-gray-500 italic">Empty line...</span>}
      </p>

      {/* Actions */}
      <div className="shrink-0 flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddAfter}
          className="h-7 w-7 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
          aria-label="Add segment after"
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-7 w-7 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
          aria-label="Edit segment"
        >
          <Pencil1Icon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          aria-label="Remove segment"
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
