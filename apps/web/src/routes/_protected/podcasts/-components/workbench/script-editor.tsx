import { useState } from 'react';
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
} from '@dnd-kit/sortable';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import type { ScriptSegment } from '@/hooks/use-script-editor';
import { SegmentItem } from './segment-item';
import { SegmentEditorDialog } from './segment-editor-dialog';
import { AddSegmentDialog } from './add-segment-dialog';

interface ScriptEditorProps {
  segments: ScriptSegment[];
  onUpdateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  onRemoveSegment: (index: number) => void;
  onReorderSegments: (fromIndex: number, toIndex: number) => void;
  onAddSegment: (afterIndex: number, data: Omit<ScriptSegment, 'index'>) => void;
}

export function ScriptEditor({
  segments,
  onUpdateSegment,
  onRemoveSegment,
  onReorderSegments,
  onAddSegment,
}: ScriptEditorProps) {
  const [editingSegment, setEditingSegment] = useState<ScriptSegment | null>(null);
  const [addAfterIndex, setAddAfterIndex] = useState<number | null>(null);

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
      const oldIndex = segments.findIndex((s) => s.index === active.id);
      const newIndex = segments.findIndex((s) => s.index === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderSegments(oldIndex, newIndex);
      }
    }
  };

  const handleEdit = (segment: ScriptSegment) => {
    setEditingSegment(segment);
  };

  const handleSaveEdit = (data: { speaker: string; line: string }) => {
    if (editingSegment) {
      onUpdateSegment(editingSegment.index, data);
      setEditingSegment(null);
    }
  };

  const handleAddSegment = (data: { speaker: string; line: string }) => {
    if (addAfterIndex !== null) {
      onAddSegment(addAfterIndex, data);
      setAddAfterIndex(null);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={segments.map((s) => s.index)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {segments.map((segment, idx) => (
              <SegmentItem
                key={segment.index}
                segment={segment}
                lineNumber={idx + 1}
                onEdit={() => handleEdit(segment)}
                onRemove={() => onRemoveSegment(segment.index)}
                onAddAfter={() => setAddAfterIndex(segment.index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add segment at end */}
      <div className="mt-5 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddAfterIndex(segments[segments.length - 1]?.index ?? -1)}
          className="text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 border border-dashed border-gray-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 rounded-lg px-4 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-1.5" />
          Add Segment
        </Button>
      </div>

      {/* Edit dialog */}
      <SegmentEditorDialog
        open={editingSegment !== null}
        onOpenChange={(open) => !open && setEditingSegment(null)}
        segment={editingSegment}
        onSave={handleSaveEdit}
      />

      {/* Add dialog */}
      <AddSegmentDialog
        open={addAfterIndex !== null}
        onOpenChange={(open) => !open && setAddAfterIndex(null)}
        onAdd={handleAddSegment}
      />
    </>
  );
}
