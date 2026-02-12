import { PlusIcon } from '@radix-ui/react-icons';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScriptSegment } from '../../hooks/use-script-editor';
import { SegmentItem } from './segment-item';

interface ScriptEditorProps {
  segments: ScriptSegment[];
  disabled?: boolean;
  onUpdateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  onRemoveSegment: (index: number) => void;
  onAddSegment: (
    afterIndex: number,
    data: Omit<ScriptSegment, 'index'>,
  ) => void;
}

/**
 * Inline new segment row - appears immediately when adding a segment.
 * Auto-focuses and saves on Enter/blur, cancels on Escape if empty.
 */
function NewSegmentRow({
  speaker,
  onSave,
  onCancel,
  onSpeakerToggle,
}: {
  speaker: string;
  onSave: (line: string) => void;
  onCancel: () => void;
  onSpeakerToggle: () => void;
}) {
  const [line, setLine] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and scroll into view
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = line.trim();
    if (trimmed) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  }, [line, onSave, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave, onCancel],
  );

  const isHost = speaker.toLowerCase() === 'host';
  const isCohost = speaker.toLowerCase() === 'cohost';

  return (
    <div className="segment-row editing new-segment">
      <div className="segment-row-speaker">
        <div
          className="segment-speaker-toggle"
          role="radiogroup"
          aria-label="Speaker"
        >
          <button
            type="button"
            role="radio"
            aria-checked={isHost}
            onClick={() => {
              if (!isHost) onSpeakerToggle();
            }}
            className={`segment-speaker-btn host ${isHost ? 'active' : ''}`}
          >
            Host
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isCohost}
            onClick={() => {
              if (!isCohost) onSpeakerToggle();
            }}
            className={`segment-speaker-btn cohost ${isCohost ? 'active' : ''}`}
          >
            Co
          </button>
        </div>
      </div>
      <div className="segment-row-content">
        <textarea
          ref={textareaRef}
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="Type your line..."
          className="segment-edit-textarea"
          rows={1}
          aria-label="New dialogue line"
        />
        <div className="segment-edit-hints">
          <span className="segment-edit-hint">
            <kbd>Enter</kbd> save
          </span>
          <span className="segment-edit-hint">
            <kbd>Esc</kbd> cancel
          </span>
        </div>
      </div>
    </div>
  );
}

export function ScriptEditor({
  segments,
  disabled,
  onUpdateSegment,
  onRemoveSegment,
  onAddSegment,
}: ScriptEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSegment, setNewSegment] = useState<{
    afterIndex: number;
    speaker: string;
  } | null>(null);
  const newSegmentRef = useRef(newSegment);
  newSegmentRef.current = newSegment;

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
        const nextSegment = segments[currentArrayIndex + 1];
        if (nextSegment) {
          setEditingIndex(nextSegment.index);
        } else {
          setEditingIndex(null);
        }
      } else {
        const prevSegment = segments[currentArrayIndex - 1];
        if (prevSegment) {
          setEditingIndex(prevSegment.index);
        }
      }
    },
    [segments],
  );

  const getOppositeSpeaker = useCallback(
    (afterIndex: number): string => {
      if (afterIndex === -1) return 'host';
      const arrayIdx = segments.findIndex((s) => s.index === afterIndex);
      if (arrayIdx === -1) return 'host';
      const prevSpeaker = segments[arrayIdx]?.speaker.toLowerCase();
      return prevSpeaker === 'host' ? 'cohost' : 'host';
    },
    [segments],
  );

  const handleAddAfter = useCallback(
    (segmentIndex: number) => {
      setEditingIndex(null);
      setNewSegment({
        afterIndex: segmentIndex,
        speaker: getOppositeSpeaker(segmentIndex),
      });
    },
    [getOppositeSpeaker],
  );

  const handleNewSegmentSave = useCallback(
    (line: string) => {
      const current = newSegmentRef.current;
      if (current) {
        onAddSegment(current.afterIndex, {
          speaker: current.speaker,
          line,
        });
        setNewSegment(null);
      }
    },
    [onAddSegment],
  );

  const handleNewSegmentCancel = useCallback(() => {
    setNewSegment(null);
  }, []);

  const handleNewSegmentSpeakerToggle = useCallback(() => {
    setNewSegment((prev) => {
      if (!prev) return prev;
      const newSpeaker = prev.speaker === 'host' ? 'cohost' : 'host';
      return { ...prev, speaker: newSpeaker };
    });
  }, []);

  return (
    <div className="script-segments">
      {/* New segment at start */}
      {newSegment && newSegment.afterIndex === -1 && (
        <NewSegmentRow
          speaker={newSegment.speaker}
          onSave={handleNewSegmentSave}
          onCancel={handleNewSegmentCancel}
          onSpeakerToggle={handleNewSegmentSpeakerToggle}
        />
      )}

      {segments.map((segment) => (
        <div key={segment.index}>
          <SegmentItem
            segment={segment}
            segmentIndex={segment.index}
            isEditing={editingIndex === segment.index}
            disabled={disabled || newSegment !== null}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onNavigate={handleNavigate}
            onRemove={onRemoveSegment}
            onAddAfter={handleAddAfter}
          />
          {/* New segment after this one */}
          {newSegment && newSegment.afterIndex === segment.index && (
            <NewSegmentRow
              speaker={newSegment.speaker}
              onSave={handleNewSegmentSave}
              onCancel={handleNewSegmentCancel}
              onSpeakerToggle={handleNewSegmentSpeakerToggle}
            />
          )}
        </div>
      ))}

      {/* Add new line button */}
      {!newSegment && (
        <button
          type="button"
          onClick={() =>
            handleAddAfter(segments[segments.length - 1]?.index ?? -1)
          }
          className="script-add-line-btn"
          disabled={disabled}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New line</span>
        </button>
      )}
    </div>
  );
}
