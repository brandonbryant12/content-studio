// features/infographics/components/workbench/text-highlighter.tsx

import { PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useRef, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useTextHighlight, type TextSelection } from '../../hooks/use-text-highlight';
import { MAX_SELECTION_LENGTH } from '../../hooks/use-selections';

/** Selection from the infographic (stored in DB) */
export interface ExistingSelection {
  id: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
}

export interface TextHighlighterProps {
  /** Document text content to display */
  content: string;
  /** Existing selections to highlight */
  existingSelections: ExistingSelection[];
  /** Callback when user adds a new selection */
  onAddSelection: (selection: TextSelection) => void;
  /** Callback when user removes an existing selection */
  onRemoveSelection: (selectionId: string) => void;
  /** Whether the highlighter is disabled */
  disabled?: boolean;
}

/**
 * Text highlighter component for selecting text from documents.
 * Shows existing selections with highlight overlay and allows adding new ones.
 */
export function TextHighlighter({
  content,
  existingSelections,
  onAddSelection,
  onRemoveSelection,
  disabled = false,
}: TextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    selection,
    buttonPosition,
    isOverLimit,
    charCount,
    clearSelection,
    handleMouseUp,
  } = useTextHighlight({
    containerRef,
    maxLength: MAX_SELECTION_LENGTH,
    disabled,
  });

  const handleAdd = () => {
    if (!selection || isOverLimit) return;

    onAddSelection(selection);
    clearSelection();
  };

  // Render content with highlight overlays
  const highlightedContent = useMemo(() => {
    return renderHighlightedText(
      content,
      existingSelections,
      onRemoveSelection,
      disabled,
    );
  }, [content, existingSelections, onRemoveSelection, disabled]);

  return (
    <div className="text-highlighter">
      <div
        ref={containerRef}
        className="text-highlighter-content"
        onMouseUp={handleMouseUp}
      >
        {highlightedContent}
      </div>

      {/* Floating Add Selection Button */}
      {selection && buttonPosition && !disabled && (
        <SelectionPopup
          position={buttonPosition}
          charCount={charCount}
          isOverLimit={isOverLimit}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

interface SelectionPopupProps {
  position: { top: number; left: number };
  charCount: {
    current: number;
    max: number;
    remaining: number;
    isWarning: boolean;
  };
  isOverLimit: boolean;
  onAdd: () => void;
}

function SelectionPopup({
  position,
  charCount,
  isOverLimit,
  onAdd,
}: SelectionPopupProps) {
  return createPortal(
    <div
      className="selection-popup"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
    >
      <Button
        size="sm"
        onClick={onAdd}
        disabled={isOverLimit}
        className="selection-button"
      >
        <PlusIcon className="w-3.5 h-3.5 mr-1" />
        Add Selection
      </Button>
      <div
        className={`selection-counter ${
          isOverLimit ? 'error' : charCount.isWarning ? 'warning' : ''
        }`}
      >
        {charCount.current}/{charCount.max}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Render text with highlight overlays for existing selections.
 * Handles overlapping selections by sorting and rendering in order.
 */
function renderHighlightedText(
  content: string,
  selections: ExistingSelection[],
  onRemove: (id: string) => void,
  disabled: boolean,
): React.ReactNode {
  if (selections.length === 0) {
    return content;
  }

  // Sort selections by start offset
  const sortedSelections = [...selections].sort(
    (a, b) => a.startOffset - b.startOffset,
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const selection of sortedSelections) {
    const { id, startOffset, endOffset } = selection;

    // Skip invalid or out-of-bounds selections
    if (startOffset < 0 || endOffset > content.length || startOffset >= endOffset) {
      continue;
    }

    // Skip if this selection overlaps with already rendered content
    if (startOffset < lastIndex) {
      continue;
    }

    // Add text before this highlight
    if (startOffset > lastIndex) {
      parts.push(
        <Fragment key={`text-${lastIndex}`}>
          {content.slice(lastIndex, startOffset)}
        </Fragment>,
      );
    }

    // Add highlighted text
    parts.push(
      <HighlightedSpan
        key={id}
        id={id}
        text={content.slice(startOffset, endOffset)}
        onRemove={onRemove}
        disabled={disabled}
      />,
    );

    lastIndex = endOffset;
  }

  // Add remaining text after last highlight
  if (lastIndex < content.length) {
    parts.push(
      <Fragment key={`text-${lastIndex}`}>
        {content.slice(lastIndex)}
      </Fragment>,
    );
  }

  return parts;
}

interface HighlightedSpanProps {
  id: string;
  text: string;
  onRemove: (id: string) => void;
  disabled: boolean;
}

function HighlightedSpan({
  id,
  text,
  onRemove,
  disabled,
}: HighlightedSpanProps) {
  return (
    <span
      className={`selection-highlight ${disabled ? 'disabled' : ''}`}
      onClick={(e) => {
        if (!disabled) {
          e.stopPropagation();
          onRemove(id);
        }
      }}
      title={disabled ? undefined : 'Click to remove'}
    >
      {text}
      {!disabled && (
        <button
          type="button"
          className="selection-highlight-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          aria-label="Remove selection"
        >
          <Cross2Icon className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
