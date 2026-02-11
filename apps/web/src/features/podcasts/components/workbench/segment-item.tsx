import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { memo, useState, useRef, useEffect, useCallback } from 'react';
import type { ScriptSegment } from '../../hooks/use-script-editor';

interface SegmentItemProps {
  segment: ScriptSegment;
  segmentIndex: number;
  isEditing: boolean;
  disabled?: boolean;
  onStartEdit: (segmentIndex: number) => void;
  onSaveEdit: (
    segmentIndex: number,
    data: { speaker: string; line: string },
  ) => void;
  onCancelEdit: () => void;
  onNavigate: (segmentIndex: number, direction: 'next' | 'prev') => void;
  onRemove: (segmentIndex: number) => void;
  onAddAfter: (segmentIndex: number) => void;
}

export const SegmentItem = memo(function SegmentItem({
  segment,
  segmentIndex,
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

  // Stable callback that calls parent with segmentIndex
  const handleSave = useCallback(() => {
    const trimmedLine = editLine.trim();
    if (trimmedLine !== segment.line || editSpeaker !== segment.speaker) {
      onSaveEdit(segmentIndex, { speaker: editSpeaker, line: trimmedLine });
    } else {
      onCancelEdit();
    }
  }, [
    editLine,
    editSpeaker,
    segment.line,
    segment.speaker,
    segmentIndex,
    onSaveEdit,
    onCancelEdit,
  ]);

  const handleNavigateNext = useCallback(() => {
    onNavigate(segmentIndex, 'next');
  }, [segmentIndex, onNavigate]);

  const handleNavigatePrev = useCallback(() => {
    onNavigate(segmentIndex, 'prev');
  }, [segmentIndex, onNavigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelEdit();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
        handleNavigateNext();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleSave();
        if (e.shiftKey) {
          handleNavigatePrev();
        } else {
          handleNavigateNext();
        }
      }
    },
    [onCancelEdit, handleSave, handleNavigateNext, handleNavigatePrev],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Check if focus is moving to another element within the segment
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget?.closest('.segment-row.editing')) {
        return;
      }
      handleSave();
    },
    [handleSave],
  );

  const handleContentClick = useCallback(() => {
    if (!isEditing && !disabled) {
      onStartEdit(segmentIndex);
    }
  }, [isEditing, disabled, segmentIndex, onStartEdit]);

  const handleRemove = useCallback(() => {
    onRemove(segmentIndex);
  }, [segmentIndex, onRemove]);

  const handleAddAfter = useCallback(() => {
    onAddAfter(segmentIndex);
  }, [segmentIndex, onAddAfter]);

  const isHost = editSpeaker.toLowerCase() === 'host';
  const isCohost = editSpeaker.toLowerCase() === 'cohost';

  return (
    <div
      className={`group segment-row ${isEditing ? 'editing' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {/* Speaker - toggle in edit mode, badge in view mode */}
      <div className="segment-row-speaker">
        {isEditing ? (
          <div
            className="segment-speaker-toggle"
            role="radiogroup"
            aria-label="Speaker"
          >
            <button
              type="button"
              role="radio"
              aria-checked={isHost}
              onClick={() => setEditSpeaker('host')}
              className={`segment-speaker-btn host ${isHost ? 'active' : ''}`}
            >
              Host
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isCohost}
              onClick={() => setEditSpeaker('cohost')}
              className={`segment-speaker-btn cohost ${isCohost ? 'active' : ''}`}
            >
              Co
            </button>
          </div>
        ) : (
          <span
            className={`segment-row-speaker-badge ${isHost ? 'host' : 'guest'}`}
          >
            {segment.speaker}
          </span>
        )}
      </div>

      {/* Content - inline edit or display */}
      {isEditing ? (
        <div className="segment-row-content">
          <textarea
            ref={textareaRef}
            value={editLine}
            onChange={(e) => setEditLine(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Enter dialogue..."
            className="segment-edit-textarea"
            rows={1}
            aria-label={`Edit ${editSpeaker} dialogue`}
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
          className="segment-row-content"
          onClick={handleContentClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleContentClick()}
        >
          {segment.line || (
            <span className="segment-row-empty">Click to add dialogue...</span>
          )}
        </p>
      )}

      {/* Actions */}
      <div className="segment-row-actions">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddAfter}
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
          onClick={handleRemove}
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
});
