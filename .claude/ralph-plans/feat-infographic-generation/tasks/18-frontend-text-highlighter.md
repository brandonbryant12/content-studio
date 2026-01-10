# Task 18: Frontend - Text Highlighter

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/frontend/components.md`

## Context

The text highlighter is a core UX component that enables users to select text from document content. Key requirements:
- Click-drag to select text
- "Add Selection" button appears near selection
- Existing selections shown with different highlight color
- Click existing selection to view/remove
- Character limit enforcement (500 chars) with visual feedback

## Key Files

### Create New Files:
- `apps/web/src/features/infographics/components/workbench/text-highlighter.tsx`
- `apps/web/src/features/infographics/hooks/use-text-highlight.ts`

## Implementation Notes

### Text Highlight Hook

```typescript
// apps/web/src/features/infographics/hooks/use-text-highlight.ts
import { useState, useCallback, useRef, useEffect } from 'react';

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface UseTextHighlightOptions {
  maxLength?: number;
  onSelectionComplete?: (selection: TextSelection) => void;
}

export const useTextHighlight = (options: UseTextHighlightOptions = {}) => {
  const { maxLength = 500, onSelectionComplete } = options;
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentSelection, setCurrentSelection] = useState<TextSelection | null>(null);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setCurrentSelection(null);
      setSelectionPosition(null);
      return;
    }

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setCurrentSelection(null);
      setSelectionPosition(null);
      return;
    }

    // Calculate offsets relative to container text content
    const containerText = containerRef.current.textContent || '';
    const startOffset = containerText.indexOf(text);
    const endOffset = startOffset + text.length;

    const newSelection: TextSelection = {
      text,
      startOffset,
      endOffset,
    };

    setCurrentSelection(newSelection);
    setIsOverLimit(text.length > maxLength);

    // Position the add button near the selection
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setSelectionPosition({
      x: rect.right - containerRect.left,
      y: rect.top - containerRect.top - 40,
    });
  }, [maxLength]);

  const handleAddSelection = useCallback(() => {
    if (currentSelection && !isOverLimit && onSelectionComplete) {
      onSelectionComplete(currentSelection);
      setCurrentSelection(null);
      setSelectionPosition(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [currentSelection, isOverLimit, onSelectionComplete]);

  const clearSelection = useCallback(() => {
    setCurrentSelection(null);
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSelection]);

  return {
    containerRef,
    currentSelection,
    isOverLimit,
    selectionPosition,
    handleMouseUp,
    handleAddSelection,
    clearSelection,
    maxLength,
  };
};
```

### Text Highlighter Component

```typescript
// apps/web/src/features/infographics/components/workbench/text-highlighter.tsx
import { useMemo } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTextHighlight, type TextSelection } from '../../hooks/use-text-highlight';
import { cn } from '@/lib/utils';

interface ExistingSelection {
  id: string;
  text: string;
  startOffset: number | null;
  endOffset: number | null;
}

interface TextHighlighterProps {
  content: string;
  existingSelections: ExistingSelection[];
  onAddSelection: (selection: TextSelection) => void;
  onClickExistingSelection?: (selectionId: string) => void;
  maxLength?: number;
  className?: string;
}

export function TextHighlighter({
  content,
  existingSelections,
  onAddSelection,
  onClickExistingSelection,
  maxLength = 500,
  className,
}: TextHighlighterProps) {
  const {
    containerRef,
    currentSelection,
    isOverLimit,
    selectionPosition,
    handleMouseUp,
    handleAddSelection,
  } = useTextHighlight({
    maxLength,
    onSelectionComplete: onAddSelection,
  });

  // Render content with existing selections highlighted
  const highlightedContent = useMemo(() => {
    if (existingSelections.length === 0) {
      return content;
    }

    // Sort selections by start offset
    const sortedSelections = existingSelections
      .filter((s) => s.startOffset !== null && s.endOffset !== null)
      .sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));

    if (sortedSelections.length === 0) {
      return content;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedSelections.forEach((selection, index) => {
      const start = selection.startOffset ?? 0;
      const end = selection.endOffset ?? 0;

      // Add text before this selection
      if (start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {content.slice(lastIndex, start)}
          </span>
        );
      }

      // Add highlighted selection
      parts.push(
        <mark
          key={`selection-${selection.id}`}
          className="bg-yellow-200 dark:bg-yellow-800 cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700 px-0.5 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onClickExistingSelection?.(selection.id);
          }}
          title="Click to view selection"
        >
          {content.slice(start, end)}
        </mark>
      );

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key="text-end">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  }, [content, existingSelections, onClickExistingSelection]);

  return (
    <div className={cn('relative', className)}>
      {/* Content container */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="prose prose-sm max-w-none dark:prose-invert select-text cursor-text whitespace-pre-wrap leading-relaxed"
      >
        {highlightedContent}
      </div>

      {/* Selection popup */}
      {currentSelection && selectionPosition && (
        <div
          className="absolute z-10 flex items-center gap-2 bg-background border rounded-lg shadow-lg p-2"
          style={{
            left: Math.max(0, selectionPosition.x - 100),
            top: Math.max(0, selectionPosition.y),
          }}
        >
          {isOverLimit ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>
                {currentSelection.text.length}/{maxLength} chars (too long)
              </span>
            </div>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {currentSelection.text.length}/{maxLength}
              </span>
              <Button size="sm" onClick={handleAddSelection}>
                <Plus className="w-4 h-4 mr-1" />
                Add Selection
              </Button>
            </>
          )}
        </div>
      )}

      {/* Character count hint */}
      <div className="mt-2 text-xs text-muted-foreground">
        Highlight text to add to your infographic (max {maxLength} characters per selection)
      </div>
    </div>
  );
}
```

### Alternative: Simpler Implementation with Popovers

If the above is too complex, here's a simpler approach using native selection:

```typescript
// Simpler version using native browser selection
export function SimpleTextHighlighter({
  content,
  existingSelections,
  onAddSelection,
  maxLength = 500,
}: TextHighlighterProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setShowPopover(false);
      return;
    }

    const text = sel.toString().trim();
    if (text.length === 0) {
      setShowPopover(false);
      return;
    }

    setSelection({
      text,
      startOffset: 0, // Would need proper calculation
      endOffset: text.length,
    });
    setShowPopover(true);
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onMouseUp={handleSelection}
        className="whitespace-pre-wrap select-text"
      >
        {content}
      </div>

      {showPopover && selection && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3 z-50">
          <span className="text-sm">
            Selected: {selection.text.slice(0, 30)}...
            ({selection.text.length} chars)
          </span>
          {selection.text.length <= maxLength ? (
            <Button
              size="sm"
              onClick={() => {
                onAddSelection(selection);
                setShowPopover(false);
                window.getSelection()?.removeAllRanges();
              }}
            >
              Add to Infographic
            </Button>
          ) : (
            <span className="text-destructive text-sm">Too long (max {maxLength})</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowPopover(false);
              window.getSelection()?.removeAllRanges();
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Integration with Document Panel

```typescript
// In document-content-panel.tsx
function DocumentContentPanel({ documentId, infographicId, existingSelections }) {
  const { data: content } = useDocumentContent(documentId);
  const addSelectionMutation = useAddSelection(infographicId);

  const handleAddSelection = async (selection: TextSelection) => {
    await addSelectionMutation.mutateAsync({
      documentId,
      selectedText: selection.text,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
    });
  };

  const documentSelections = existingSelections.filter(
    (s) => s.documentId === documentId
  );

  return (
    <TextHighlighter
      content={content.content}
      existingSelections={documentSelections}
      onAddSelection={handleAddSelection}
      maxLength={500}
    />
  );
}
```

## Verification Log

<!-- Agent writes verification results here -->
