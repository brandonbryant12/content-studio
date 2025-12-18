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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon, PersonIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { SortableSegment } from './components/sortable-segment';

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

  // If empty state
  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-800">
        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3 text-violet-600 dark:text-violet-400">
          <PersonIcon className="w-6 h-6" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Start the conversation
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
    <div className="space-y-6">
      {/* Summary - Collapsible */}
      {summary && (
        <details className="group/summary rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 open:bg-violet-50 dark:open:bg-violet-900/20 transition-all">
          <summary className="cursor-pointer p-4 list-none flex items-center justify-between outline-none">
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Episode Summary
            </p>
            <span className="text-violet-400 group-open/summary:rotate-180 transition-transform">
              <span className="sr-only">Toggle</span>
              ▼
            </span>
          </summary>
          <div className="px-4 pb-4 pt-0 text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-t border-violet-200/50 dark:border-violet-800/50 mt-2 pt-2">
            {summary}
          </div>
        </details>
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
          <div className="relative pl-4 pr-4 pb-20">
            <div className="space-y-4">
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
          </div>
        </SortableContext>
      </DndContext>

      {/* Add segment button */}
      {!readOnly && (
        <div className="flex justify-center pt-4 pb-8">
          <Button
            variant="outline"
            className="rounded-full px-6 shadow-sm hover:shadow-md transition-all active:scale-95"
            onClick={handleAddSegment}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Message
          </Button>
        </div>
      )}
    </div>
  );
}
