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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Select } from '@repo/ui/components/select';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';

export interface ScriptSegment {
  speaker: string;
  line: string;
  index: number;
}

interface ScriptEditorProps {
  segments: ScriptSegment[];
  onChange: (segments: ScriptSegment[]) => void;
  readOnly?: boolean;
  summary?: string | null;
}

interface SortableSegmentProps {
  segment: ScriptSegment;
  onUpdate: (index: number, field: 'speaker' | 'line', value: string) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

function SortableSegment({
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      {/* Drag handle */}
      {!readOnly && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
        >
          <DragHandleDots2Icon className="w-4 h-4" />
        </button>
      )}

      {/* Speaker selector */}
      <div className="flex-shrink-0 w-24">
        {readOnly ? (
          <span
            className={cn(
              'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
              segment.speaker.toLowerCase() === 'host'
                ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                : 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-700 dark:text-fuchsia-300',
            )}
          >
            {segment.speaker}
          </span>
        ) : (
          <Select
            value={segment.speaker}
            onChange={(e) => onUpdate(segment.index, 'speaker', e.target.value)}
            className="text-xs h-8"
          >
            <option value="host">Host</option>
            <option value="cohost">Co-host</option>
          </Select>
        )}
      </div>

      {/* Line text */}
      <div className="flex-1 min-w-0">
        {readOnly ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {segment.line}
          </p>
        ) : (
          <Textarea
            value={segment.line}
            onChange={(e) => onUpdate(segment.index, 'line', e.target.value)}
            className="text-sm min-h-[60px] resize-none"
            placeholder="Enter dialogue..."
          />
        )}
      </div>

      {/* Remove button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => onRemove(segment.index)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ScriptEditor({
  segments,
  onChange,
  readOnly = false,
  summary,
}: ScriptEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = segments.findIndex((s) => s.index === active.id);
      const newIndex = segments.findIndex((s) => s.index === over.id);

      const reordered = arrayMove(segments, oldIndex, newIndex).map(
        (segment, i) => ({
          ...segment,
          index: i,
        }),
      );
      onChange(reordered);
    }
  };

  const handleUpdate = (
    index: number,
    field: 'speaker' | 'line',
    value: string,
  ) => {
    const updated = segments.map((s) =>
      s.index === index ? { ...s, [field]: value } : s,
    );
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const filtered = segments
      .filter((s) => s.index !== index)
      .map((s, i) => ({ ...s, index: i }));
    onChange(filtered);
  };

  const handleAddSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const lastSpeaker = lastSegment?.speaker ?? 'host';
    const newSpeaker = lastSpeaker === 'host' ? 'cohost' : 'host';
    const newSegment: ScriptSegment = {
      speaker: newSpeaker,
      line: '',
      index: segments.length,
    };
    onChange([...segments, newSegment]);
  };

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          No script segments yet.
        </p>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={handleAddSegment}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add First Segment
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">
            Summary
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{summary}</p>
        </div>
      )}

      {/* Segments */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={segments.map((s) => s.index)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {segments.map((segment) => (
              <SortableSegment
                key={segment.index}
                segment={segment}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                readOnly={readOnly}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add segment button */}
      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSegment}
          className="w-full"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Segment
        </Button>
      )}

      {/* Segment count */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {segments.length} segment{segments.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
