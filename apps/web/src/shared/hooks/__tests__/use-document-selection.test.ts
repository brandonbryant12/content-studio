import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  useDocumentSelection,
  type DocumentInfo,
} from '../use-document-selection';

function createDoc(overrides: Partial<DocumentInfo>): DocumentInfo {
  return {
    id: overrides.id ?? 'doc-1',
    title: overrides.title ?? 'Document',
    mimeType: overrides.mimeType ?? 'text/plain',
    wordCount: overrides.wordCount ?? 100,
  };
}

const renderSelection = (initialDocuments: DocumentInfo[]) =>
  renderHook(() => useDocumentSelection({ initialDocuments }));

const renderSelectionWithServerDocs = (initialDocuments: DocumentInfo[]) =>
  renderHook(
    ({ docs }: { docs: DocumentInfo[] }) =>
      useDocumentSelection({ initialDocuments: docs }),
    { initialProps: { docs: initialDocuments } },
  );

const addDocuments = (
  result: { current: ReturnType<typeof useDocumentSelection> },
  docs: DocumentInfo[],
) => {
  act(() => {
    result.current.addDocuments(docs);
  });
};

const removeDocument = (
  result: { current: ReturnType<typeof useDocumentSelection> },
  docId: string,
) => {
  act(() => {
    result.current.removeDocument(docId);
  });
};

describe('useDocumentSelection', () => {
  it('returns initial documents and hasChanges=false', () => {
    const initialDocuments = [
      createDoc({ id: 'doc-1' }),
      createDoc({ id: 'doc-2' }),
    ];

    const { result } = renderSelection(initialDocuments);

    expect(result.current.documents).toEqual(initialDocuments);
    expect(result.current.documentIds).toEqual(['doc-1', 'doc-2']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('marks hasChanges when adding a new document', () => {
    const initialDocuments = [createDoc({ id: 'doc-1' })];
    const newDoc = createDoc({ id: 'doc-2' });

    const { result } = renderSelection(initialDocuments);

    addDocuments(result, [newDoc]);

    expect(result.current.documentIds).toEqual(['doc-1', 'doc-2']);
    expect(result.current.hasChanges).toBe(true);
  });

  it('clears change state when removing and re-adding an initial document', () => {
    const initialDocuments = [
      createDoc({ id: 'doc-1' }),
      createDoc({ id: 'doc-2' }),
    ];

    const { result } = renderSelection(initialDocuments);

    removeDocument(result, 'doc-2');
    expect(result.current.documentIds).toEqual(['doc-1']);
    expect(result.current.hasChanges).toBe(true);

    addDocuments(result, [createDoc({ id: 'doc-2', title: 'Doc 2' })]);
    expect(result.current.documentIds).toEqual(['doc-1', 'doc-2']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('clears change state when adding and then removing the same new document', () => {
    const initialDocuments = [createDoc({ id: 'doc-1' })];
    const newDoc = createDoc({ id: 'doc-3' });

    const { result } = renderSelection(initialDocuments);

    addDocuments(result, [newDoc]);
    expect(result.current.documentIds).toEqual(['doc-1', 'doc-3']);
    expect(result.current.hasChanges).toBe(true);

    removeDocument(result, 'doc-3');
    expect(result.current.documentIds).toEqual(['doc-1']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('updates visible documents when initialDocuments changes and no local edits exist', () => {
    const initialDocuments = [createDoc({ id: 'doc-1' })];
    const nextInitialDocuments = [createDoc({ id: 'doc-9' })];

    const { result, rerender } =
      renderSelectionWithServerDocs(initialDocuments);

    expect(result.current.documentIds).toEqual(['doc-1']);
    expect(result.current.hasChanges).toBe(false);

    rerender({ docs: nextInitialDocuments });

    expect(result.current.documentIds).toEqual(['doc-9']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('preserves local removals while incorporating new server documents', () => {
    const initialDocuments = [
      createDoc({ id: 'doc-1' }),
      createDoc({ id: 'doc-2' }),
    ];
    const serverUpdatedDocuments = [
      createDoc({ id: 'doc-1' }),
      createDoc({ id: 'doc-2' }),
      createDoc({ id: 'doc-3' }),
    ];

    const { result, rerender } =
      renderSelectionWithServerDocs(initialDocuments);

    removeDocument(result, 'doc-2');
    expect(result.current.documentIds).toEqual(['doc-1']);
    expect(result.current.hasChanges).toBe(true);

    rerender({ docs: serverUpdatedDocuments });

    expect(result.current.documentIds).toEqual(['doc-1', 'doc-3']);
    expect(result.current.hasChanges).toBe(true);
  });

  it('uses server document metadata once a locally added id becomes part of baseline', () => {
    const initialDocuments = [createDoc({ id: 'doc-1', title: 'Baseline 1' })];
    const locallyAdded = createDoc({ id: 'doc-2', title: 'Local title' });
    const serverUpdatedDocuments = [
      createDoc({ id: 'doc-1', title: 'Baseline 1' }),
      createDoc({ id: 'doc-2', title: 'Server title' }),
    ];

    const { result, rerender } =
      renderSelectionWithServerDocs(initialDocuments);

    addDocuments(result, [locallyAdded]);
    expect(result.current.hasChanges).toBe(true);
    expect(
      result.current.documents.find((doc) => doc.id === 'doc-2')?.title,
    ).toBe('Local title');

    rerender({ docs: serverUpdatedDocuments });

    expect(result.current.hasChanges).toBe(false);
    expect(
      result.current.documents.find((doc) => doc.id === 'doc-2')?.title,
    ).toBe('Server title');
  });

  it('discardChanges resets to current server state', () => {
    const initialDocuments = [createDoc({ id: 'doc-1' })];
    const serverUpdatedDocuments = [
      createDoc({ id: 'doc-1' }),
      createDoc({ id: 'doc-2' }),
    ];

    const { result, rerender } =
      renderSelectionWithServerDocs(initialDocuments);

    addDocuments(result, [createDoc({ id: 'doc-9' })]);
    expect(result.current.documentIds).toEqual(['doc-1', 'doc-9']);
    expect(result.current.hasChanges).toBe(true);

    rerender({ docs: serverUpdatedDocuments });

    act(() => {
      result.current.discardChanges();
    });

    expect(result.current.documentIds).toEqual(['doc-1', 'doc-2']);
    expect(result.current.hasChanges).toBe(false);
  });
});
