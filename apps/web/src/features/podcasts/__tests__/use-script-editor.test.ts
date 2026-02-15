import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useScriptEditor,
  type ScriptSegment,
} from '../hooks/use-script-editor';

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    podcasts: {
      saveChanges: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: vi.fn(async () => ({})),
          ...options,
        }),
      },
    },
  },
}));

function createSegment(
  index: number,
  overrides: Partial<ScriptSegment> = {},
): ScriptSegment {
  return {
    index,
    speaker: overrides.speaker ?? 'host',
    line: overrides.line ?? `line-${index}`,
  };
}

describe('useScriptEditor', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    };
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('returns initial segments with no changes', () => {
    const initialSegments = [createSegment(0), createSegment(1)];

    const { result } = renderHook(
      () =>
        useScriptEditor({
          podcastId: 'pod-1',
          initialSegments,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.segments).toEqual(initialSegments);
    expect(result.current.hasChanges).toBe(false);
  });

  it('tracks segment edits and allows discard back to baseline', () => {
    const initialSegments = [createSegment(0), createSegment(1)];

    const { result } = renderHook(
      () =>
        useScriptEditor({
          podcastId: 'pod-1',
          initialSegments,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.updateSegment(0, { line: 'updated-line' });
    });
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.segments[0]?.line).toBe('updated-line');

    act(() => {
      result.current.discardChanges();
    });
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.segments).toEqual(initialSegments);
  });

  it('clears hasChanges when edits are reverted to baseline values', () => {
    const initialSegments = [createSegment(0, { line: 'a' })];

    const { result } = renderHook(
      () =>
        useScriptEditor({
          podcastId: 'pod-1',
          initialSegments,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.updateSegment(0, { line: 'b' });
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.updateSegment(0, { line: 'a' });
    });
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.segments[0]?.line).toBe('a');
  });

  it('follows new server baseline when there are no local edits', () => {
    const initialSegments = [createSegment(0, { line: 'old' })];
    const serverUpdated = [createSegment(0, { line: 'new' })];

    const { result, rerender } = renderHook(
      ({ segments }: { segments: ScriptSegment[] }) =>
        useScriptEditor({
          podcastId: 'pod-1',
          initialSegments: segments,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { segments: initialSegments },
      },
    );

    expect(result.current.segments[0]?.line).toBe('old');

    rerender({ segments: serverUpdated });

    expect(result.current.segments[0]?.line).toBe('new');
    expect(result.current.hasChanges).toBe(false);
  });

  it('preserves local draft when server baseline changes mid-edit', () => {
    const initialSegments = [createSegment(0, { line: 'server-v1' })];
    const serverUpdated = [createSegment(0, { line: 'server-v2' })];

    const { result, rerender } = renderHook(
      ({ segments }: { segments: ScriptSegment[] }) =>
        useScriptEditor({
          podcastId: 'pod-1',
          initialSegments: segments,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { segments: initialSegments },
      },
    );

    act(() => {
      result.current.updateSegment(0, { line: 'local-draft' });
    });
    expect(result.current.segments[0]?.line).toBe('local-draft');

    rerender({ segments: serverUpdated });

    expect(result.current.segments[0]?.line).toBe('local-draft');
    expect(result.current.hasChanges).toBe(true);
  });

  it('keeps drafts isolated per podcast id', () => {
    const aSegments = [createSegment(0, { line: 'pod-a' })];
    const bSegments = [createSegment(0, { line: 'pod-b' })];

    const { result, rerender } = renderHook(
      ({
        podcastId,
        segments,
      }: {
        podcastId: string;
        segments: ScriptSegment[];
      }) =>
        useScriptEditor({
          podcastId,
          initialSegments: segments,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { podcastId: 'pod-a', segments: aSegments },
      },
    );

    act(() => {
      result.current.updateSegment(0, { line: 'pod-a-draft' });
    });
    expect(result.current.segments[0]?.line).toBe('pod-a-draft');

    rerender({ podcastId: 'pod-b', segments: bSegments });
    expect(result.current.segments[0]?.line).toBe('pod-b');
    expect(result.current.hasChanges).toBe(false);

    rerender({ podcastId: 'pod-a', segments: aSegments });
    expect(result.current.segments[0]?.line).toBe('pod-a-draft');
    expect(result.current.hasChanges).toBe(true);
  });

  it('resetToSegments establishes a new clean baseline', () => {
    const initialSegments = [createSegment(0, { line: 'original' })];
    const savedSegments = [createSegment(0, { line: 'saved' })];

    const { result } = renderHook(
      () =>
        useScriptEditor({
          podcastId: 'pod-1',
          initialSegments,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.updateSegment(0, { line: 'draft' });
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.resetToSegments(savedSegments);
    });

    expect(result.current.segments).toEqual(savedSegments);
    expect(result.current.hasChanges).toBe(false);
  });
});
