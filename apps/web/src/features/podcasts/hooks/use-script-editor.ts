import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

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

interface OptimisticSavedEntry {
  segments: ScriptSegment[];
  baseServerHash: string;
}

function serializeSegments(segments: ScriptSegment[]): string {
  return JSON.stringify(segments);
}

function segmentsEqual(a: ScriptSegment[], b: ScriptSegment[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (
      left.index !== right.index ||
      left.speaker !== right.speaker ||
      left.line !== right.line
    ) {
      return false;
    }
  }
  return true;
}

export function useScriptEditor({
  podcastId,
  initialSegments,
}: UseScriptEditorOptions): UseScriptEditorReturn {
  const [draftByPodcastId, setDraftByPodcastId] = useState<
    Record<string, ScriptSegment[]>
  >({});
  const [optimisticSavedByPodcastId, setOptimisticSavedByPodcastId] = useState<
    Record<string, OptimisticSavedEntry>
  >({});

  const initialSegmentsHash = useMemo(
    () => serializeSegments(initialSegments),
    [initialSegments],
  );

  const optimisticSaved = optimisticSavedByPodcastId[podcastId];
  const optimisticSegments =
    optimisticSaved?.baseServerHash === initialSegmentsHash
      ? optimisticSaved.segments
      : undefined;

  const baselineSegments = optimisticSegments ?? initialSegments;
  const draftSegments = draftByPodcastId[podcastId];
  const segments = draftSegments ?? baselineSegments;

  const hasChanges =
    draftSegments != null && !segmentsEqual(draftSegments, baselineSegments);

  const setDraftSegments = useCallback(
    (updater: (current: ScriptSegment[]) => ScriptSegment[]) => {
      setDraftByPodcastId((prev) => {
        const current = prev[podcastId] ?? baselineSegments;
        const next = updater(current);

        if (segmentsEqual(next, baselineSegments)) {
          if (!(podcastId in prev)) return prev;
          const { [podcastId]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [podcastId]: next,
        };
      });
    },
    [podcastId, baselineSegments],
  );

  const saveChangesMutation = useMutation(
    apiClient.podcasts.saveChanges.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save script'));
      },
    }),
  );

  const updateSegment = useCallback(
    (index: number, data: Partial<ScriptSegment>) => {
      setDraftSegments((current) =>
        current.map((segment) =>
          segment.index === index ? { ...segment, ...data } : segment,
        ),
      );
    },
    [setDraftSegments],
  );

  const addSegment = useCallback(
    (afterIndex: number, data: Omit<ScriptSegment, 'index'>) => {
      setDraftSegments((current) => {
        const insertPosition =
          afterIndex === -1
            ? 0
            : Math.max(0, current.findIndex((s) => s.index === afterIndex) + 1);

        const maxIndex = current.reduce((max, s) => Math.max(max, s.index), -1);
        const newSegment: ScriptSegment = {
          ...data,
          index: maxIndex + 1,
        };

        const nextSegments = [...current];
        nextSegments.splice(insertPosition, 0, newSegment);
        return nextSegments.map((segment, i) => ({ ...segment, index: i }));
      });
    },
    [setDraftSegments],
  );

  const removeSegment = useCallback(
    (index: number) => {
      setDraftSegments((current) => {
        const filtered = current.filter((segment) => segment.index !== index);
        return filtered.map((segment, i) => ({ ...segment, index: i }));
      });
    },
    [setDraftSegments],
  );

  const reorderSegments = useCallback(
    (fromIndex: number, toIndex: number) => {
      setDraftSegments((current) => {
        const nextSegments = [...current];
        const [removed] = nextSegments.splice(fromIndex, 1);
        if (!removed) return current;
        nextSegments.splice(toIndex, 0, removed);
        return nextSegments.map((segment, i) => ({ ...segment, index: i }));
      });
    },
    [setDraftSegments],
  );

  const saveCurrentAsBaseline = useCallback(
    (nextSegments: ScriptSegment[]) => {
      setDraftByPodcastId((prev) => {
        if (!(podcastId in prev)) return prev;
        const { [podcastId]: _removed, ...rest } = prev;
        return rest;
      });
      setOptimisticSavedByPodcastId((prev) => ({
        ...prev,
        [podcastId]: {
          segments: nextSegments,
          baseServerHash: initialSegmentsHash,
        },
      }));
    },
    [podcastId, initialSegmentsHash],
  );

  const saveChanges = useCallback(() => {
    saveChangesMutation.mutate(
      {
        id: podcastId,
        segments: segments.map((segment) => ({
          speaker: segment.speaker,
          line: segment.line,
          index: segment.index,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Script saved. Regenerating audio...');
          saveCurrentAsBaseline(segments);
        },
      },
    );
  }, [podcastId, segments, saveChangesMutation, saveCurrentAsBaseline]);

  const discardChanges = useCallback(() => {
    setDraftByPodcastId((prev) => {
      if (!(podcastId in prev)) return prev;
      const { [podcastId]: _removed, ...rest } = prev;
      return rest;
    });
  }, [podcastId]);

  const resetToSegments = useCallback(
    (nextSegments: ScriptSegment[]) => {
      saveCurrentAsBaseline(nextSegments);
    },
    [saveCurrentAsBaseline],
  );

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
