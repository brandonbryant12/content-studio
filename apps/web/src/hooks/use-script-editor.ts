import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

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
  const [originalSegments, setOriginalSegments] = useState<ScriptSegment[]>(initialSegments);

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

  const updateScriptMutation = useMutation(
    apiClient.podcasts.updateScript.mutationOptions({
      onSuccess: async () => {
        toast.success('Script saved');
        setOriginalSegments(segments);
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to save script');
      },
    }),
  );

  const updateSegment = useCallback((index: number, data: Partial<ScriptSegment>) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.index === index ? { ...seg, ...data } : seg)),
    );
  }, []);

  const addSegment = useCallback((afterIndex: number, data: Omit<ScriptSegment, 'index'>) => {
    setSegments((prev) => {
      // Find position to insert
      const insertPosition = afterIndex === -1 ? 0 : prev.findIndex((s) => s.index === afterIndex) + 1;

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
  }, []);

  const removeSegment = useCallback((index: number) => {
    setSegments((prev) => {
      const filtered = prev.filter((seg) => seg.index !== index);
      // Re-index to maintain continuous order
      return filtered.map((seg, i) => ({ ...seg, index: i }));
    });
  }, []);

  const reorderSegments = useCallback((fromIndex: number, toIndex: number) => {
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
    updateScriptMutation.mutate({
      id: podcastId,
      segments: segments.map((seg) => ({
        speaker: seg.speaker,
        line: seg.line,
        index: seg.index,
      })),
    });
  }, [podcastId, segments, updateScriptMutation]);

  const discardChanges = useCallback(() => {
    setSegments(originalSegments);
  }, [originalSegments]);

  const resetToSegments = useCallback((newSegments: ScriptSegment[]) => {
    setSegments(newSegments);
    setOriginalSegments(newSegments);
  }, []);

  return {
    segments,
    hasChanges,
    isSaving: updateScriptMutation.isPending,
    updateSegment,
    addSegment,
    removeSegment,
    reorderSegments,
    saveChanges,
    discardChanges,
    resetToSegments,
  };
}
