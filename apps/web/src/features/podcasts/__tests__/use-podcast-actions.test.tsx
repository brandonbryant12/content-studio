import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePodcastActions } from '../hooks/use-podcast-actions';

const {
  navigateSpy,
  updateMutationFn,
  deleteMutationFn,
  generateMutateSpy,
  saveChangesMutateSpy,
  toastSuccessSpy,
} = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  updateMutationFn: vi.fn(
    async (_input: unknown, _context?: unknown): Promise<unknown> => ({}),
  ),
  deleteMutationFn: vi.fn(
    async (_input: unknown, _context?: unknown): Promise<unknown> => ({}),
  ),
  generateMutateSpy: vi.fn(
    (_input: unknown, _options?: unknown): void => undefined,
  ),
  saveChangesMutateSpy: vi.fn(
    (_input: unknown, _options?: unknown): void => undefined,
  ),
  toastSuccessSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

vi.mock('../hooks/use-optimistic-generation', () => ({
  useOptimisticGeneration: () => ({
    mutate: generateMutateSpy,
    isPending: false,
  }),
}));

vi.mock('../hooks/use-optimistic-save-changes', () => ({
  useOptimisticSaveChanges: () => ({
    mutate: saveChangesMutateSpy,
    isPending: false,
  }),
}));

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    podcasts: {
      update: {
        mutationOptions: (options: Record<string, unknown> = {}) => ({
          mutationFn: updateMutationFn,
          ...options,
        }),
      },
      delete: {
        mutationOptions: (options: Record<string, unknown> = {}) => ({
          mutationFn: deleteMutationFn,
          ...options,
        }),
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessSpy,
    error: vi.fn(),
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

function createPodcast(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pod_1',
    status: 'ready',
    ...overrides,
  } as never;
}

function createScriptEditor(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    segments: [{ speaker: 'host', line: 'Hello world', index: 0 }],
    hasChanges: false,
    isSaving: false,
    resetToSegments: vi.fn(),
    ...overrides,
  } as never;
}

function createSettings(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hostVoice: 'Aoede',
    coHostVoice: 'Charon',
    targetDuration: 5,
    instructions: '',
    hostPersonaId: null,
    coHostPersonaId: null,
    hasChanges: false,
    hasScriptSettingsChanges: false,
    ...overrides,
  } as never;
}

function createSourceSelection(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    sources: [],
    sourceIds: ['src_1'],
    hasChanges: false,
    ...overrides,
  } as never;
}

describe('usePodcastActions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    updateMutationFn.mockResolvedValue({});
    deleteMutationFn.mockResolvedValue({});
    generateMutateSpy.mockImplementation(((
      _input: unknown,
      options?: { onSuccess?: () => void },
    ) => {
      options?.onSuccess?.();
    }) as never);
    saveChangesMutateSpy.mockImplementation(((
      _input: unknown,
      options?: { onSuccess?: () => void },
    ) => {
      options?.onSuccess?.();
    }) as never);
  });

  it('treats script-affecting settings edits as full regeneration changes', async () => {
    const { result } = renderHook(
      () =>
        usePodcastActions({
          podcastId: 'pod_1',
          podcast: createPodcast(),
          scriptEditor: createScriptEditor(),
          settings: createSettings({
            hasChanges: true,
            hasScriptSettingsChanges: true,
            instructions: 'Tighten the pacing.',
          }),
          sourceSelection: createSourceSelection(),
        }),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.needsFullRegeneration).toBe(true);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateMutationFn.mock.calls[0]?.[0]).toEqual({
      id: 'pod_1',
      sourceIds: undefined,
      episodePlan: undefined,
      hostVoice: 'Aoede',
      coHostVoice: 'Charon',
      targetDurationMinutes: 5,
      promptInstructions: 'Tighten the pacing.',
      hostPersonaId: null,
      coHostPersonaId: null,
    });
    expect(generateMutateSpy).toHaveBeenCalledWith(
      { id: 'pod_1' },
      expect.any(Object),
    );
    expect(saveChangesMutateSpy).not.toHaveBeenCalled();
  });

  it('clears a stale plan when sources change', async () => {
    const { result } = renderHook(
      () =>
        usePodcastActions({
          podcastId: 'pod_1',
          podcast: createPodcast(),
          scriptEditor: createScriptEditor(),
          settings: createSettings(),
          sourceSelection: createSourceSelection({
            hasChanges: true,
            sourceIds: ['src_2'],
          }),
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateMutationFn.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        id: 'pod_1',
        sourceIds: ['src_2'],
        episodePlan: null,
      }),
    );
    expect(generateMutateSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps script-only saves on the audio regeneration path', async () => {
    const resetToSegments = vi.fn();
    const segments = [{ speaker: 'host', line: 'Edited line', index: 0 }];
    const { result } = renderHook(
      () =>
        usePodcastActions({
          podcastId: 'pod_1',
          podcast: createPodcast(),
          scriptEditor: createScriptEditor({
            hasChanges: true,
            segments,
            resetToSegments,
          }),
          settings: createSettings(),
          sourceSelection: createSourceSelection(),
        }),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.needsFullRegeneration).toBe(false);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(saveChangesMutateSpy).toHaveBeenCalledWith(
      {
        id: 'pod_1',
        segments,
        hostVoice: undefined,
        coHostVoice: undefined,
      },
      expect.any(Object),
    );
    expect(updateMutationFn).not.toHaveBeenCalled();
    expect(generateMutateSpy).not.toHaveBeenCalled();
    expect(resetToSegments).toHaveBeenCalledWith(segments);
  });
});
