import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatePodcast } from '../hooks/use-create-podcast';
import { getPodcastQueryKey } from '../hooks/use-podcast';
import { getPodcastListQueryKey } from '../hooks/use-podcast-list';

const { createPodcastMock, navigateMock } = vi.hoisted(() => ({
  createPodcastMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('@/clients/apiClient', () => ({
  apiClient: {
    podcasts: {
      create: {
        mutationOptions: (options: Record<string, unknown> = {}) => ({
          mutationFn: createPodcastMock,
          ...options,
        }),
      },
      get: {
        queryOptions: ({ input }: { input: { id: string } }) => ({
          queryKey: ['podcasts', 'get', input.id],
        }),
      },
      list: {
        queryOptions: ({
          input,
        }: {
          input: { limit?: number | undefined };
        }) => ({
          queryKey: ['podcasts', 'list', input.limit ?? null],
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

describe('useCreatePodcast', () => {
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

  it('warms the detail cache and navigates to wizard without active list refetch', async () => {
    const createdPodcast = {
      id: 'podcast-123',
      title: 'Untitled Podcast',
    };
    createPodcastMock.mockResolvedValue(createdPodcast);

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const listQueryKey = getPodcastListQueryKey();
    queryClient.setQueryData(listQueryKey, []);

    const { result } = renderHook(() => useCreatePodcast(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        title: 'Untitled Podcast',
        format: 'conversation',
      });
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(getPodcastQueryKey(createdPodcast.id)),
      ).toEqual(createdPodcast);
    });

    expect(toast.success).toHaveBeenCalledWith('Podcast created');
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/podcasts/$podcastId',
      params: { podcastId: createdPodcast.id },
      search: { version: undefined },
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: listQueryKey,
      refetchType: 'inactive',
    });
  });
});
