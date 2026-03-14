import { useState, useCallback, useMemo } from 'react';

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
  updateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  addSegment: (afterIndex: number, data: Omit<ScriptSegment, 'index'>) => void;
  removeSegment: (index: number) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
  replaceSegments: (segments: ScriptSegment[]) => void;
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

function removeRecordKey<T>(
  record: Record<string, T>,
  key: string,
): Record<string, T> {
  if (!(key in record)) return record;
  const { [key]: _removed, ...rest } = record;
  return rest;
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

function normalizeExternalSegments(
  segments: readonly ScriptSegment[],
): ScriptSegment[] {
  return segments
    .map((segment, originalIndex) => ({
      speaker: segment.speaker.trim(),
      line: segment.line.trim(),
      index: Number.isFinite(segment.index) ? segment.index : originalIndex,
      originalIndex,
    }))
    .filter((segment) => segment.line.length > 0)
    .sort(
      (left, right) =>
        left.index - right.index || left.originalIndex - right.originalIndex,
    )
    .map(({ originalIndex: _originalIndex, ...segment }, index) => ({
      ...segment,
      index,
    }));
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

  const normalizedInitialSegments = useMemo(
    () => normalizeExternalSegments(initialSegments),
    [initialSegments],
  );

  const initialSegmentsHash = useMemo(
    () => serializeSegments(normalizedInitialSegments),
    [normalizedInitialSegments],
  );

  const optimisticSaved = optimisticSavedByPodcastId[podcastId];
  const optimisticSegments =
    optimisticSaved?.baseServerHash === initialSegmentsHash
      ? optimisticSaved.segments
      : undefined;

  const baselineSegments = optimisticSegments ?? normalizedInitialSegments;
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
          return removeRecordKey(prev, podcastId);
        }

        return {
          ...prev,
          [podcastId]: next,
        };
      });
    },
    [podcastId, baselineSegments],
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

  const replaceSegments = useCallback(
    (nextSegments: ScriptSegment[]) => {
      const normalizedSegments = normalizeExternalSegments(nextSegments);
      setDraftSegments(() => normalizedSegments);
    },
    [setDraftSegments],
  );

  const saveCurrentAsBaseline = useCallback(
    (nextSegments: ScriptSegment[]) => {
      const normalizedSegments = normalizeExternalSegments(nextSegments);

      setDraftByPodcastId((prev) => removeRecordKey(prev, podcastId));
      setOptimisticSavedByPodcastId((prev) => ({
        ...prev,
        [podcastId]: {
          segments: normalizedSegments,
          baseServerHash: initialSegmentsHash,
        },
      }));
    },
    [podcastId, initialSegmentsHash],
  );

  const discardChanges = useCallback(
    () => setDraftByPodcastId((prev) => removeRecordKey(prev, podcastId)),
    [podcastId],
  );

  return {
    segments,
    hasChanges,
    updateSegment,
    addSegment,
    removeSegment,
    reorderSegments,
    replaceSegments,
    discardChanges,
    resetToSegments: saveCurrentAsBaseline,
  };
}
