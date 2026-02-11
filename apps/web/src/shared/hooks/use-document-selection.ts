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

export function useDocumentSelection({
  initialDocuments,
}: UseDocumentSelectionOptions): UseDocumentSelectionReturn {
  const [documents, setDocuments] = useState<DocumentInfo[]>(initialDocuments);
  const [prevInitialSerialized, setPrevInitialSerialized] = useState(() =>
    JSON.stringify(initialDocuments.map((d) => d.id).sort()),
  );

  // Sync with server data when it changes (adjust state during render)
  const serialized = JSON.stringify(initialDocuments.map((d) => d.id).sort());
  if (serialized !== prevInitialSerialized) {
    setPrevInitialSerialized(serialized);
    setDocuments(initialDocuments);
  }

  const documentIds = useMemo(() => documents.map((d) => d.id), [documents]);

  const hasChanges = useMemo(() => {
    const initialIds = initialDocuments.map((d) => d.id).sort();
    const currentIds = [...documentIds].sort();
    if (initialIds.length !== currentIds.length) return true;
    return initialIds.some((id, i) => id !== currentIds[i]);
  }, [initialDocuments, documentIds]);

  const addDocuments = useCallback((docs: DocumentInfo[]) => {
    setDocuments((prev) => {
      const existingIds = new Set(prev.map((d) => d.id));
      const newDocs = docs.filter((d) => !existingIds.has(d.id));
      return [...prev, ...newDocs];
    });
  }, []);

  const removeDocument = useCallback((docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  const discardChanges = useCallback(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  return {
    documents,
    documentIds,
    addDocuments,
    removeDocument,
    discardChanges,
    hasChanges,
  };
}
