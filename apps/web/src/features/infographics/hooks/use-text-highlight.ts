// features/infographics/hooks/use-text-highlight.ts

import { useState, useCallback, useEffect } from 'react';
import { MAX_SELECTION_LENGTH } from './use-selections';

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface SelectionPosition {
  top: number;
  left: number;
}

export interface UseTextHighlightOptions {
  /** Container element reference */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Maximum allowed selection length */
  maxLength?: number;
  /** Whether highlighting is disabled */
  disabled?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selection: TextSelection | null) => void;
}

export interface UseTextHighlightReturn {
  /** Currently selected text info */
  selection: TextSelection | null;
  /** Position for floating button (viewport coordinates) */
  buttonPosition: SelectionPosition | null;
  /** Whether current selection exceeds max length */
  isOverLimit: boolean;
  /** Character count info */
  charCount: {
    current: number;
    max: number;
    remaining: number;
    isWarning: boolean;
  };
  /** Clear the current selection */
  clearSelection: () => void;
  /** Handler for mouseup event */
  handleMouseUp: () => void;
}

/**
 * Hook for managing text selection state in the text highlighter.
 * Tracks browser text selection and provides position info for floating UI.
 */
export function useTextHighlight({
  containerRef,
  maxLength = MAX_SELECTION_LENGTH,
  disabled = false,
  onSelectionChange,
}: UseTextHighlightOptions): UseTextHighlightReturn {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [buttonPosition, setButtonPosition] =
    useState<SelectionPosition | null>(null);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setButtonPosition(null);
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    if (disabled) return;

    const browserSelection = window.getSelection();
    const selectedText = browserSelection?.toString().trim();

    if (!selectedText || selectedText.length === 0) {
      setSelection(null);
      setButtonPosition(null);
      onSelectionChange?.(null);
      return;
    }

    // Check if selection is within our container
    if (!containerRef.current) return;

    const range = browserSelection?.getRangeAt(0);
    if (!range) return;

    const container = containerRef.current;
    if (
      !container.contains(range.startContainer) ||
      !container.contains(range.endContainer)
    ) {
      return;
    }

    // Calculate offset relative to container text content
    // This walks the DOM to find the actual character offset
    const startOffset = getTextOffset(
      container,
      range.startContainer,
      range.startOffset,
    );
    const endOffset = getTextOffset(
      container,
      range.endContainer,
      range.endOffset,
    );

    const newSelection: TextSelection = {
      text: selectedText,
      startOffset,
      endOffset,
    };

    setSelection(newSelection);
    onSelectionChange?.(newSelection);

    // Position button below selection
    const rect = range.getBoundingClientRect();
    setButtonPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, [disabled, containerRef, onSelectionChange]);

  // Clear selection on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // If clicking outside the container, clear selection
      if (!containerRef.current.contains(e.target as Node)) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [containerRef, clearSelection]);

  // Character count info
  const current = selection?.text.length ?? 0;
  const charCount = {
    current,
    max: maxLength,
    remaining: maxLength - current,
    isWarning: current > maxLength * 0.8, // 80% threshold
  };

  const isOverLimit = current > maxLength;

  return {
    selection,
    buttonPosition,
    isOverLimit,
    charCount,
    clearSelection,
    handleMouseUp,
  };
}

/**
 * Calculate the character offset of a position within a container.
 * Walks the DOM tree to count characters before the given position.
 */
function getTextOffset(
  container: Node,
  targetNode: Node,
  targetOffset: number,
): number {
  let offset = 0;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode === targetNode) {
      return offset + targetOffset;
    }
    offset += currentNode.textContent?.length ?? 0;
    currentNode = walker.nextNode();
  }

  return offset;
}
