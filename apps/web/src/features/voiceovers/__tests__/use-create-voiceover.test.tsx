import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateVoiceover } from '../hooks/use-create-voiceover';
import { getVoiceoverQueryKey } from '../hooks/use-voiceover';
import { getVoiceoverListQueryKey } from '../hooks/use-voiceover-list';

const { createVoiceoverMock, navigateMock } = vi.hoisted(() => ({
  createVoiceoverMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    voiceovers: {
      create: {
        mutationOptions: (options: Record<string, unknown> = {}) => ({
          mutationFn: createVoiceoverMock,
          ...options,
        }),
      },
      get: {
        queryOptions: ({ input }: { input: { id: string } }) => ({
          queryKey: ['voiceovers', 'get', input.id],
        }),
      },
      list: {
        queryOptions: ({
          input,
        }: {
          input: { limit?: number | undefined };
        }) => ({
          queryKey: ['voiceovers', 'list', input.limit ?? null],
        }),
      },
    },
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useCreateVoiceover', () => {
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
    vi.clearAllMocks();
  });

  it('warms the detail cache and navigates without active list refetch', async () => {
    const createdVoiceover = {
      id: 'voiceover-123',
      title: 'Untitled Voiceover',
    };
    createVoiceoverMock.mockResolvedValue(createdVoiceover);

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const listQueryKey = getVoiceoverListQueryKey();
    queryClient.setQueryData(listQueryKey, []);

    const { result } = renderHook(() => useCreateVoiceover(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ title: 'Untitled Voiceover' });
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(getVoiceoverQueryKey(createdVoiceover.id)),
      ).toEqual(createdVoiceover);
    });

    expect(toast.success).toHaveBeenCalledWith('Voiceover created');
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/voiceovers/$voiceoverId',
      params: { voiceoverId: createdVoiceover.id },
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: listQueryKey,
      refetchType: 'inactive',
    });
  });
});
