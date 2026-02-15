import { useState, useCallback, useMemo } from 'react';

export interface DocumentInfo {
  id: string;
  title: string;
  mimeType: string;
  wordCount: number;
}

interface UseDocumentSelectionOptions {
  initialDocuments: DocumentInfo[];
}

export interface UseDocumentSelectionReturn {
  // Current selected documents
  documents: DocumentInfo[];
  documentIds: string[];

  // Actions
  addDocuments: (docs: DocumentInfo[]) => void;
  removeDocument: (docId: string) => void;
  discardChanges: () => void;

  // State
  hasChanges: boolean;
}

interface SelectionDiffState {
  addedById: Record<string, DocumentInfo>;
  removedById: Record<string, true>;
}

function createEmptyDiffState(): SelectionDiffState {
  return { addedById: {}, removedById: {} };
}

export function useDocumentSelection({
  initialDocuments,
}: UseDocumentSelectionOptions): UseDocumentSelectionReturn {
  const [diffState, setDiffState] = useState<SelectionDiffState>(
    createEmptyDiffState,
  );

  const initialById = useMemo(() => {
    const map = new Map<string, DocumentInfo>();
    for (const doc of initialDocuments) {
      map.set(doc.id, doc);
    }
    return map;
  }, [initialDocuments]);

  const documents = useMemo(() => {
    const merged: DocumentInfo[] = [];

    for (const doc of initialDocuments) {
      if (diffState.removedById[doc.id]) continue;
      merged.push(doc);
    }

    for (const [id, doc] of Object.entries(diffState.addedById)) {
      if (!initialById.has(id)) {
        merged.push(doc);
      }
    }

    return merged;
  }, [diffState.addedById, diffState.removedById, initialDocuments, initialById]);

  const documentIds = useMemo(() => documents.map((d) => d.id), [documents]);

  const hasChanges = useMemo(() => {
    for (const id of Object.keys(diffState.removedById)) {
      if (initialById.has(id)) return true;
    }
    for (const id of Object.keys(diffState.addedById)) {
      if (!initialById.has(id)) return true;
    }
    return false;
  }, [diffState.addedById, diffState.removedById, initialById]);

  const addDocuments = useCallback(
    (docs: DocumentInfo[]) => {
      setDiffState((prev) => {
        let addedById = prev.addedById;
        let removedById = prev.removedById;
        let changed = false;

        for (const doc of docs) {
          const id = doc.id;
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

          if (addedById[id] !== doc) {
            if (!changed) {
              addedById = { ...addedById };
              changed = true;
            }
            addedById[id] = doc;
          }
        }

        return changed ? { addedById, removedById } : prev;
      });
    },
    [initialById],
  );

  const removeDocument = useCallback(
    (docId: string) => {
      setDiffState((prev) => {
        if (initialById.has(docId)) {
          if (prev.removedById[docId]) return prev;
          return {
            addedById: prev.addedById,
            removedById: { ...prev.removedById, [docId]: true },
          };
        }

        if (!(docId in prev.addedById)) return prev;
        const { [docId]: _removed, ...restAddedById } = prev.addedById;
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
    documents,
    documentIds,
    addDocuments,
    removeDocument,
    discardChanges,
    hasChanges,
  };
}
