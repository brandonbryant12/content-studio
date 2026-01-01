import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';

export interface ScriptSegment {
  speaker: string;
  line: string;
  index: number;
}

interface UseScriptEditorOptions {
  podcastId: string;
  initialSegments: ScriptSegment[];
}

export interface UseScriptEditorReturn {
  segments: ScriptSegment[];
  hasChanges: boolean;
  isSaving: boolean;
  updateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  addSegment: (afterIndex: number, data: Omit<ScriptSegment, 'index'>) => void;
  removeSegment: (index: number) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
  saveChanges: () => void;
  discardChanges: () => void;
  resetToSegments: (segments: ScriptSegment[]) => void;
}

export function useScriptEditor({
  podcastId,
  initialSegments,
}: UseScriptEditorOptions): UseScriptEditorReturn {
  const [segments, setSegments] = useState<ScriptSegment[]>(initialSegments);
  const [originalSegments, setOriginalSegments] =
    useState<ScriptSegment[]>(initialSegments);
  const hasUserEdits = useRef(false);
  const prevInitialSegmentsRef = useRef<string>('');

  // Sync with server data when it changes (e.g., after generation completes)
  // Only sync if user hasn't made local edits
  // Use JSON comparison to avoid infinite loops from array reference changes
  useEffect(() => {
    const serialized = JSON.stringify(initialSegments);
    if (serialized !== prevInitialSegmentsRef.current && !hasUserEdits.current) {
      prevInitialSegmentsRef.current = serialized;
      setSegments(initialSegments);
      setOriginalSegments(initialSegments);
    }
  }, [initialSegments]);

  const hasChanges = useMemo(() => {
    if (segments.length !== originalSegments.length) return true;
    return segments.some((seg, i) => {
      const orig = originalSegments[i];
      if (!orig) return true;
      return (
        seg.speaker !== orig.speaker ||
        seg.line !== orig.line ||
        seg.index !== orig.index
      );
    });
  }, [segments, originalSegments]);

  const saveChangesMutation = useMutation(
    apiClient.podcasts.saveChanges.mutationOptions({
      onSuccess: () => {
        toast.success('Script saved. Regenerating audio...');
        setOriginalSegments(segments);
      },
      onError: (error: { message?: string }) => {
        toast.error(error.message ?? 'Failed to save script');
      },
    }),
  );

  const updateSegment = useCallback(
    (index: number, data: Partial<ScriptSegment>) => {
      hasUserEdits.current = true;
      setSegments((prev) =>
        prev.map((seg) => (seg.index === index ? { ...seg, ...data } : seg)),
      );
    },
    [],
  );

  const addSegment = useCallback(
    (afterIndex: number, data: Omit<ScriptSegment, 'index'>) => {
      hasUserEdits.current = true;
      setSegments((prev) => {
        // Find position to insert
        const insertPosition =
          afterIndex === -1
            ? 0
            : prev.findIndex((s) => s.index === afterIndex) + 1;

        // Create new segment with unique index
        const maxIndex = prev.reduce((max, s) => Math.max(max, s.index), -1);
        const newSegment: ScriptSegment = {
          ...data,
          index: maxIndex + 1,
        };

        // Insert at position
        const newSegments = [...prev];
        newSegments.splice(insertPosition, 0, newSegment);

        // Re-index all segments to maintain order
        return newSegments.map((seg, i) => ({ ...seg, index: i }));
      });
    },
    [],
  );

  const removeSegment = useCallback((index: number) => {
    hasUserEdits.current = true;
    setSegments((prev) => {
      const filtered = prev.filter((seg) => seg.index !== index);
      // Re-index to maintain continuous order
      return filtered.map((seg, i) => ({ ...seg, index: i }));
    });
  }, []);

  const reorderSegments = useCallback((fromIndex: number, toIndex: number) => {
    hasUserEdits.current = true;
    setSegments((prev) => {
      const newSegments = [...prev];
      const [removed] = newSegments.splice(fromIndex, 1);
      if (!removed) return prev;
      newSegments.splice(toIndex, 0, removed);
      // Re-index after reorder
      return newSegments.map((seg, i) => ({ ...seg, index: i }));
    });
  }, []);

  const saveChanges = useCallback(() => {
    saveChangesMutation.mutate({
      id: podcastId,
      segments: segments.map((seg) => ({
        speaker: seg.speaker,
        line: seg.line,
        index: seg.index,
      })),
    });
  }, [podcastId, segments, saveChangesMutation]);

  const discardChanges = useCallback(() => {
    hasUserEdits.current = false;
    setSegments(originalSegments);
  }, [originalSegments]);

  const resetToSegments = useCallback((newSegments: ScriptSegment[]) => {
    hasUserEdits.current = false;
    setSegments(newSegments);
    setOriginalSegments(newSegments);
  }, []);

  return {
    segments,
    hasChanges,
    isSaving: saveChangesMutation.isPending,
    updateSegment,
    addSegment,
    removeSegment,
    reorderSegments,
    saveChanges,
    discardChanges,
    resetToSegments,
  };
}
