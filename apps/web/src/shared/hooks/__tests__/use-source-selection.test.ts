import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSourceSelection, type SourceInfo } from '../use-source-selection';

function createSource(overrides: Partial<SourceInfo>): SourceInfo {
  return {
    id: overrides.id ?? 'src-1',
    title: overrides.title ?? 'Source',
    mimeType: overrides.mimeType ?? 'text/plain',
    wordCount: overrides.wordCount ?? 100,
  };
}

const renderSelection = (initialSources: SourceInfo[]) =>
  renderHook(() => useSourceSelection({ initialSources }));

const renderSelectionWithServerSources = (initialSources: SourceInfo[]) =>
  renderHook(
    ({ sources }: { sources: SourceInfo[] }) =>
      useSourceSelection({ initialSources: sources }),
    { initialProps: { sources: initialSources } },
  );

const addSources = (
  result: { current: ReturnType<typeof useSourceSelection> },
  sources: SourceInfo[],
) => {
  act(() => {
    result.current.addSources(sources);
  });
};

const removeSource = (
  result: { current: ReturnType<typeof useSourceSelection> },
  sourceId: string,
) => {
  act(() => {
    result.current.removeSource(sourceId);
  });
};

describe('useSourceSelection', () => {
  it('returns initial sources and hasChanges=false', () => {
    const initialSources = [
      createSource({ id: 'src-1' }),
      createSource({ id: 'src-2' }),
    ];

    const { result } = renderSelection(initialSources);

    expect(result.current.sources).toEqual(initialSources);
    expect(result.current.sourceIds).toEqual(['src-1', 'src-2']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('marks hasChanges when adding a new source', () => {
    const initialSources = [createSource({ id: 'src-1' })];
    const newSource = createSource({ id: 'src-2' });

    const { result } = renderSelection(initialSources);

    addSources(result, [newSource]);

    expect(result.current.sourceIds).toEqual(['src-1', 'src-2']);
    expect(result.current.hasChanges).toBe(true);
  });

  it('clears change state when removing and re-adding an initial source', () => {
    const initialSources = [
      createSource({ id: 'src-1' }),
      createSource({ id: 'src-2' }),
    ];

    const { result } = renderSelection(initialSources);

    removeSource(result, 'src-2');
    expect(result.current.sourceIds).toEqual(['src-1']);
    expect(result.current.hasChanges).toBe(true);

    addSources(result, [createSource({ id: 'src-2', title: 'Source 2' })]);
    expect(result.current.sourceIds).toEqual(['src-1', 'src-2']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('clears change state when adding and then removing the same new source', () => {
    const initialSources = [createSource({ id: 'src-1' })];
    const newSource = createSource({ id: 'src-3' });

    const { result } = renderSelection(initialSources);

    addSources(result, [newSource]);
    expect(result.current.sourceIds).toEqual(['src-1', 'src-3']);
    expect(result.current.hasChanges).toBe(true);

    removeSource(result, 'src-3');
    expect(result.current.sourceIds).toEqual(['src-1']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('updates visible sources when initialSources changes and no local edits exist', () => {
    const initialSources = [createSource({ id: 'src-1' })];
    const nextInitialSources = [createSource({ id: 'src-9' })];

    const { result, rerender } =
      renderSelectionWithServerSources(initialSources);

    expect(result.current.sourceIds).toEqual(['src-1']);
    expect(result.current.hasChanges).toBe(false);

    rerender({ sources: nextInitialSources });

    expect(result.current.sourceIds).toEqual(['src-9']);
    expect(result.current.hasChanges).toBe(false);
  });

  it('preserves local removals while incorporating new server sources', () => {
    const initialSources = [
      createSource({ id: 'src-1' }),
      createSource({ id: 'src-2' }),
    ];
    const serverUpdatedSources = [
      createSource({ id: 'src-1' }),
      createSource({ id: 'src-2' }),
      createSource({ id: 'src-3' }),
    ];

    const { result, rerender } =
      renderSelectionWithServerSources(initialSources);

    removeSource(result, 'src-2');
    expect(result.current.sourceIds).toEqual(['src-1']);
    expect(result.current.hasChanges).toBe(true);

    rerender({ sources: serverUpdatedSources });

    expect(result.current.sourceIds).toEqual(['src-1', 'src-3']);
    expect(result.current.hasChanges).toBe(true);
  });

  it('uses server source metadata once a locally added id becomes part of baseline', () => {
    const initialSources = [createSource({ id: 'src-1', title: 'Baseline 1' })];
    const locallyAdded = createSource({ id: 'src-2', title: 'Local title' });
    const serverUpdatedSources = [
      createSource({ id: 'src-1', title: 'Baseline 1' }),
      createSource({ id: 'src-2', title: 'Server title' }),
    ];

    const { result, rerender } =
      renderSelectionWithServerSources(initialSources);

    addSources(result, [locallyAdded]);
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.sources.find((s) => s.id === 'src-2')?.title).toBe(
      'Local title',
    );

    rerender({ sources: serverUpdatedSources });

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.sources.find((s) => s.id === 'src-2')?.title).toBe(
      'Server title',
    );
  });

  it('discardChanges resets to current server state', () => {
    const initialSources = [createSource({ id: 'src-1' })];
    const serverUpdatedSources = [
      createSource({ id: 'src-1' }),
      createSource({ id: 'src-2' }),
    ];

    const { result, rerender } =
      renderSelectionWithServerSources(initialSources);

    addSources(result, [createSource({ id: 'src-9' })]);
    expect(result.current.sourceIds).toEqual(['src-1', 'src-9']);
    expect(result.current.hasChanges).toBe(true);

    rerender({ sources: serverUpdatedSources });

    act(() => {
      result.current.discardChanges();
    });

    expect(result.current.sourceIds).toEqual(['src-1', 'src-2']);
    expect(result.current.hasChanges).toBe(false);
  });
});
