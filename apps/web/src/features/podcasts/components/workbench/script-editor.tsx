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
import { useState, useCallback } from 'react';
import type { ScriptSegment } from '../../hooks/use-script-editor';
import { AddSegmentDialog } from './add-segment-dialog';
import { SegmentItem } from './segment-item';

interface ScriptEditorProps {
  segments: ScriptSegment[];
  disabled?: boolean;
  onUpdateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  onRemoveSegment: (index: number) => void;
  onReorderSegments: (fromIndex: number, toIndex: number) => void;
  onAddSegment: (
    afterIndex: number,
    data: Omit<ScriptSegment, 'index'>,
  ) => void;
}

export function ScriptEditor({
  segments,
  disabled,
  onUpdateSegment,
  onRemoveSegment,
  onReorderSegments,
  onAddSegment,
}: ScriptEditorProps) {
  // Track which segment index is being edited (null = none)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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

  const handleStartEdit = useCallback((segmentIndex: number) => {
    setEditingIndex(segmentIndex);
  }, []);

  const handleSaveEdit = useCallback(
    (segmentIndex: number, data: { speaker: string; line: string }) => {
      onUpdateSegment(segmentIndex, data);
      setEditingIndex(null);
    },
    [onUpdateSegment],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const handleNavigate = useCallback(
    (currentIndex: number, direction: 'next' | 'prev') => {
      const currentArrayIndex = segments.findIndex(
        (s) => s.index === currentIndex,
      );
      if (currentArrayIndex === -1) return;

      if (direction === 'next') {
        // Move to next segment, or exit edit mode if at end
        const nextSegment = segments[currentArrayIndex + 1];
        if (nextSegment) {
          setEditingIndex(nextSegment.index);
        } else {
          setEditingIndex(null);
        }
      } else {
        // Move to previous segment, or stay if at beginning
        const prevSegment = segments[currentArrayIndex - 1];
        if (prevSegment) {
          setEditingIndex(prevSegment.index);
        }
      }
    },
    [segments],
  );

  const handleAddAfter = useCallback((segmentIndex: number) => {
    setAddAfterIndex(segmentIndex);
  }, []);

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
                segmentIndex={segment.index}
                lineNumber={idx + 1}
                isEditing={editingIndex === segment.index}
                disabled={disabled}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onNavigate={handleNavigate}
                onRemove={onRemoveSegment}
                onAddAfter={handleAddAfter}
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
          onClick={() =>
            setAddAfterIndex(segments[segments.length - 1]?.index ?? -1)
          }
          className="script-add-segment-btn"
          disabled={disabled}
        >
          <PlusIcon className="w-4 h-4 mr-1.5" />
          Add Segment
        </Button>
      </div>

      {/* Add dialog - still useful for adding with specific speaker/content */}
      <AddSegmentDialog
        open={addAfterIndex !== null}
        onOpenChange={(open) => !open && setAddAfterIndex(null)}
        onAdd={handleAddSegment}
      />
    </>
  );
}
