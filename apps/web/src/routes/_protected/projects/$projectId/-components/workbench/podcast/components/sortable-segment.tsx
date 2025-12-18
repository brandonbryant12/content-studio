import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon, TrashIcon } from '@radix-ui/react-icons';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';
import type { ScriptSegment } from '../script-editor';

interface SortableSegmentProps {
  segment: ScriptSegment;
  onUpdate: (index: number, field: 'speaker' | 'line', value: string) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

export function SortableSegment({
  segment,
  onUpdate,
  onRemove,
  readOnly,
}: SortableSegmentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: segment.index, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isHost = segment.speaker.toLowerCase() === 'host';
  const bubbleColor = isHost
    ? 'bg-violet-600 text-white selection:bg-violet-800' // Host (Primary)
    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'; // Co-host (Secondary)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex gap-3 mb-6 relative',
        isHost ? 'flex-row-reverse' : 'flex-row',
        isDragging && 'opacity-50',
      )}
    >
      {/* Avatar / Drag Handle */}
      <div className={cn('flex flex-col items-center gap-2 mt-auto', isHost ? 'items-end' : 'items-start')}>
        {!readOnly && (
          <div
            {...attributes}
            {...listeners}
            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <DragHandleDots2Icon className="w-4 h-4" />
          </div>
        )}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-xs font-bold border-2 border-white dark:border-gray-950',
            isHost
              ? 'bg-violet-100 text-violet-700'
              : 'bg-fuchsia-100 text-fuchsia-700'
          )}
        >
          {segment.speaker.slice(0, 1).toUpperCase()}
        </div>
      </div>

      {/* Bubble Container */}
      <div className={cn('flex flex-col max-w-[85%]', isHost ? 'items-end' : 'items-start')}>
        <div className={cn('flex items-center gap-2 mb-1 px-1', isHost ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
            {segment.speaker}
          </span>
          {!readOnly && (
            <button
              onClick={() => onUpdate(segment.index, 'speaker', isHost ? 'cohost' : 'host')}
              className="text-[10px] text-gray-400 hover:text-violet-500 underline decoration-dotted underline-offset-2"
            >
              Switch
            </button>
          )}
        </div>

        <div className="relative group/bubble">
          {readOnly ? (
            <div
              className={cn(
                'px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                bubbleColor,
                isHost ? 'rounded-br-none' : 'rounded-bl-none'
              )}
            >
              {segment.line}
            </div>
          ) : (
            <div className={cn('relative rounded-2xl overflow-hidden shadow-sm ring-1 ring-inset', isHost ? 'ring-violet-200 dark:ring-violet-800' : 'ring-gray-200 dark:ring-gray-800')}>
              <Textarea
                value={segment.line}
                onChange={(e) => onUpdate(segment.index, 'line', e.target.value)}
                className={cn(
                  'min-h-[80px] w-full resize-y border-0 bg-transparent py-3 px-4 text-sm focus:ring-0 leading-relaxed',
                  isHost ? 'bg-violet-50/50 dark:bg-violet-900/20' : 'bg-white dark:bg-gray-900'
                )}
                placeholder="Type dialogue..."
                style={{ fieldSizing: "content" } as any}
              />
            </div>
          )}

          {/* Actions that appear on hover */}
          {!readOnly && (
            <div className={cn("absolute top-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity", isHost ? '-left-8' : '-right-8')}>
              <button
                onClick={() => onRemove(segment.index)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                title="Remove segment"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
