import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface SearchMatch {
  /** Index of the paragraph in the content array */
  paragraphIndex: number;
  /** Start character offset within the paragraph */
  start: number;
  /** Length of the match */
  length: number;
}

export interface UseDocumentSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  matches: readonly SearchMatch[];
  currentMatchIndex: number;
  goToNext: () => void;
  goToPrevious: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useDocumentSearch(content: string): UseDocumentSearchReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const paragraphs = useMemo(() => content.split('\n'), [content]);

  const matches = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const result: SearchMatch[] = [];
    for (let pi = 0; pi < paragraphs.length; pi++) {
      const text = paragraphs[pi].toLowerCase();
      let start = 0;
      while (true) {
        const idx = text.indexOf(q, start);
        if (idx === -1) break;
        result.push({ paragraphIndex: pi, start: idx, length: query.length });
        start = idx + 1;
      }
    }
    return result;
  }, [paragraphs, query]);

  // Reset current index when matches change
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [matches.length, query]);

  // Scroll the current match into view
  useEffect(() => {
    if (matches.length === 0) return;
    const el = document.querySelector('[data-search-current="true"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIndex, matches]);

  const open = useCallback(() => {
    setIsOpen(true);
    // Focus the input after React renders
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setCurrentMatchIndex(0);
  }, []);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((i) => (i + 1) % matches.length);
  }, [matches.length]);

  const goToPrevious = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((i) => (i - 1 + matches.length) % matches.length);
  }, [matches.length]);

  return {
    query,
    setQuery,
    isOpen,
    open,
    close,
    matches,
    currentMatchIndex,
    goToNext,
    goToPrevious,
    inputRef,
  };
}
