import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DragHandleDots2Icon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useState, useRef, useEffect } from 'react';
import type { ScriptSegment } from '../../hooks';

interface SegmentItemProps {
  segment: ScriptSegment;
  lineNumber: number;
  isEditing: boolean;
  disabled?: boolean;
  onStartEdit: () => void;
  onSaveEdit: (data: { speaker: string; line: string }) => void;
  onCancelEdit: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onRemove: () => void;
  onAddAfter: () => void;
}

export function SegmentItem({
  segment,
  lineNumber,
  isEditing,
  disabled,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onNavigate,
  onRemove,
  onAddAfter,
}: SegmentItemProps) {
  const [editSpeaker, setEditSpeaker] = useState(segment.speaker);
  const [editLine, setEditLine] = useState(segment.line);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: segment.index, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Reset edit state when segment changes or editing starts
  useEffect(() => {
    if (isEditing) {
      setEditSpeaker(segment.speaker);
      setEditLine(segment.line);
      // Focus textarea after a brief delay for animation
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 50);
    }
  }, [isEditing, segment.speaker, segment.line]);

  const handleSave = () => {
    const trimmedLine = editLine.trim();
    if (trimmedLine !== segment.line || editSpeaker !== segment.speaker) {
      onSaveEdit({ speaker: editSpeaker, line: trimmedLine });
    } else {
      onCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
      onNavigate('next');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      onNavigate(e.shiftKey ? 'prev' : 'next');
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to another element within the segment
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.segment-item.editing')) {
      return;
    }
    handleSave();
  };

  const handleContentClick = () => {
    if (!isEditing && !isDragging && !disabled) {
      onStartEdit();
    }
  };

  const isHost = editSpeaker.toLowerCase() === 'host';
  const isCohost = editSpeaker.toLowerCase() === 'cohost';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group segment-item ${isDragging ? 'dragging' : ''} ${isEditing ? 'editing' : ''} ${disabled ? 'disabled' : ''}`}
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
        tabIndex={-1}
      >
        <DragHandleDots2Icon />
      </button>

      {/* Speaker - toggle in edit mode, badge in view mode */}
      <div className="segment-item-speaker">
        {isEditing ? (
          <div className="segment-speaker-toggle">
            <button
              type="button"
              onClick={() => setEditSpeaker('host')}
              className={`segment-speaker-btn host ${isHost ? 'active' : ''}`}
            >
              Host
            </button>
            <button
              type="button"
              onClick={() => setEditSpeaker('cohost')}
              className={`segment-speaker-btn cohost ${isCohost ? 'active' : ''}`}
            >
              Co
            </button>
          </div>
        ) : (
          <span
            className={`segment-item-speaker-badge ${isHost ? 'host' : 'guest'}`}
          >
            {segment.speaker}
          </span>
        )}
      </div>

      {/* Content - inline edit or display */}
      {isEditing ? (
        <div className="segment-edit-content">
          <textarea
            ref={textareaRef}
            value={editLine}
            onChange={(e) => setEditLine(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Enter dialogue..."
            className="segment-edit-textarea"
            rows={1}
          />
          <div className="segment-edit-hints">
            <span className="segment-edit-hint">
              <kbd>Tab</kbd> next
            </span>
            <span className="segment-edit-hint">
              <kbd>Esc</kbd> cancel
            </span>
            <span className="segment-edit-hint">
              <kbd>Enter</kbd> save
            </span>
          </div>
        </div>
      ) : (
        <p
          className="segment-item-content"
          onClick={handleContentClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleContentClick()}
        >
          {segment.line || (
            <span className="segment-item-empty">Click to add dialogue...</span>
          )}
        </p>
      )}

      {/* Actions */}
      <div className="segment-item-actions">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddAfter}
          className="segment-action-btn add"
          aria-label="Add segment after"
          tabIndex={-1}
          disabled={disabled}
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="segment-action-btn delete"
          aria-label="Remove segment"
          tabIndex={-1}
          disabled={disabled}
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
