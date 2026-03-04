import { useState, useCallback, useMemo } from 'react';

export interface SourceInfo {
  id: string;
  title: string;
  mimeType: string;
  wordCount: number;
}

interface UseSourceSelectionOptions {
  initialSources: SourceInfo[];
}

export interface UseSourceSelectionReturn {
  // Current selected sources
  sources: SourceInfo[];
  sourceIds: string[];

  // Actions
  addSources: (sources: SourceInfo[]) => void;
  removeSource: (sourceId: string) => void;
  discardChanges: () => void;

  // State
  hasChanges: boolean;
}

interface SelectionDiffState {
  addedById: Record<string, SourceInfo>;
  removedById: Record<string, true>;
}

function createEmptyDiffState(): SelectionDiffState {
  return { addedById: {}, removedById: {} };
}

export function useSourceSelection({
  initialSources,
}: UseSourceSelectionOptions): UseSourceSelectionReturn {
  const [diffState, setDiffState] =
    useState<SelectionDiffState>(createEmptyDiffState);

  const initialById = useMemo(() => {
    const map = new Map<string, SourceInfo>();
    for (const source of initialSources) {
      map.set(source.id, source);
    }
    return map;
  }, [initialSources]);

  const sources = useMemo(() => {
    const merged: SourceInfo[] = [];

    for (const source of initialSources) {
      if (diffState.removedById[source.id]) continue;
      merged.push(source);
    }

    for (const [id, source] of Object.entries(diffState.addedById)) {
      if (!initialById.has(id)) {
        merged.push(source);
      }
    }

    return merged;
  }, [diffState.addedById, diffState.removedById, initialSources, initialById]);

  const sourceIds = useMemo(() => sources.map((s) => s.id), [sources]);

  const hasChanges = useMemo(() => {
    for (const id of Object.keys(diffState.removedById)) {
      if (initialById.has(id)) return true;
    }
    for (const id of Object.keys(diffState.addedById)) {
      if (!initialById.has(id)) return true;
    }
    return false;
  }, [diffState.addedById, diffState.removedById, initialById]);

  const addSources = useCallback(
    (newSources: SourceInfo[]) => {
      setDiffState((prev) => {
        let addedById = prev.addedById;
        let removedById = prev.removedById;
        let changed = false;

        for (const source of newSources) {
          const id = source.id;
          if (initialById.has(id)) {
            if (removedById[id]) {
              if (!changed) {
                removedById = { ...removedById };
                changed = true;
              }
              delete removedById[id];
            }
            continue;
          }

          if (addedById[id] !== source) {
            if (!changed) {
              addedById = { ...addedById };
              changed = true;
            }
            addedById[id] = source;
          }
        }

        return changed ? { addedById, removedById } : prev;
      });
    },
    [initialById],
  );

  const removeSource = useCallback(
    (sourceId: string) => {
      setDiffState((prev) => {
        if (initialById.has(sourceId)) {
          if (prev.removedById[sourceId]) return prev;
          return {
            addedById: prev.addedById,
            removedById: { ...prev.removedById, [sourceId]: true },
          };
        }

        if (!(sourceId in prev.addedById)) return prev;
        const { [sourceId]: _removed, ...restAddedById } = prev.addedById;
        return {
          addedById: restAddedById,
          removedById: prev.removedById,
        };
      });
    },
    [initialById],
  );

  const discardChanges = useCallback(() => {
    setDiffState(createEmptyDiffState());
  }, []);

  return {
    sources,
    sourceIds,
    addSources,
    removeSource,
    discardChanges,
    hasChanges,
  };
}
