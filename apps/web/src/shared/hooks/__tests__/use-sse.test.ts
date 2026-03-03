import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleJobCompletion,
  handleVoiceoverJobCompletion,
  handleEntityChange,
} from '../sse-handlers';
import { useSSE } from '../use-sse';

vi.mock('../sse-handlers', () => ({
  handleJobCompletion: vi.fn(),
  handleVoiceoverJobCompletion: vi.fn(),
  handleInfographicJobCompletion: vi.fn(),
  handleDocumentJobCompletion: vi.fn(),
  handleEntityChange: vi.fn(),
  handleActivityLogged: vi.fn(),
  setNavigateFn: vi.fn(),
}));

function createMockIterator() {
  const events: Array<Record<string, unknown>> = [];
  let resolve: (() => void) | null = null;
  let done = false;
  let error: Error | null = null;

  const iterator: AsyncIterableIterator<Record<string, unknown>> = {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    async next() {
      while (events.length === 0 && !done && !error) {
        await new Promise<void>((r) => {
          resolve = r;
        });
        resolve = null;
      }

      if (error) throw error;
      if (events.length > 0) return { value: events.shift()!, done: false };
      return { value: undefined, done: true };
    },
    async return() {
      done = true;
      resolve?.();
      return { value: undefined, done: true };
    },
  };

  return {
    iterator,
    push(event: Record<string, unknown>) {
      events.push(event);
      resolve?.();
    },
    end() {
      done = true;
      resolve?.();
    },
    fail(err: Error) {
      error = err;
      resolve?.();
    },
  };
}

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: vi.fn(),
  }),
}));

const mockSubscribe = vi.fn();
vi.mock('@/clients/apiClient', () => ({
  rawApiClient: {
    events: {
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
    },
  },
  apiClient: {},
}));

describe('useSSE', () => {
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

  const renderEnabledSSE = () => {
    const stream = createMockIterator();
    mockSubscribe.mockResolvedValue(stream.iterator);

    const hook = renderHook(() => useSSE({ enabled: true }), {
      wrapper: createWrapper(),
    });

    return { stream, ...hook };
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('connection lifecycle', () => {
    it('starts in disconnected state when disabled', () => {
      const { result } = renderHook(() => useSSE({ enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it('subscribes and enters connecting state when enabled', () => {
      const { result } = renderEnabledSSE();

      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(result.current.connectionState).toBe('connecting');
    });

    it('transitions to connected state on connected event', async () => {
      const { stream, result } = renderEnabledSSE();

      await act(async () => {
        stream.push({ type: 'connected', userId: 'user-123' });
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });
    });

    it('aborts active subscription on unmount', () => {
      const { unmount } = renderEnabledSSE();

      unmount();

      const callArgs = mockSubscribe.mock.calls[0]!;
      expect(callArgs[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(callArgs[1]!.signal.aborted).toBe(true);
    });
  });

  describe('event handling', () => {
    it.each([
      {
        name: 'job_completion',
        event: {
          type: 'job_completion',
          jobId: 'job-123',
          jobType: 'generate-podcast',
          status: 'completed',
          podcastId: 'podcast-456',
        },
        handler: handleJobCompletion,
      },
      {
        name: 'entity_change',
        event: {
          type: 'entity_change',
          entityType: 'podcast',
          changeType: 'update',
          entityId: 'podcast-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        },
        handler: handleEntityChange,
      },
      {
        name: 'voiceover_job_completion',
        event: {
          type: 'voiceover_job_completion',
          jobId: 'job-123',
          jobType: 'generate-voiceover',
          status: 'completed',
          voiceoverId: 'voiceover-456',
        },
        handler: handleVoiceoverJobCompletion,
      },
    ])('handles $name events', async ({ event, handler }) => {
      const { stream } = renderEnabledSSE();

      await act(async () => {
        stream.push(event);
      });

      await waitFor(() => {
        expect(handler).toHaveBeenCalledWith(event, queryClient);
      });
    });
  });

  describe('reconnection', () => {
    it('reconnects when stream ends', async () => {
      const stream1 = createMockIterator();
      const stream2 = createMockIterator();
      mockSubscribe
        .mockResolvedValueOnce(stream1.iterator)
        .mockResolvedValueOnce(stream2.iterator);

      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        stream1.end();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 3000));
      });

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledTimes(2);
      });
    });

    it('sets disconnected state when stream errors', async () => {
      const { stream, result } = renderEnabledSSE();

      await act(async () => {
        stream.fail(new Error('Stream failed'));
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected');
      });
    });

    it('manual reconnect creates a new subscription', () => {
      const { result } = renderEnabledSSE();
      expect(mockSubscribe).toHaveBeenCalledTimes(1);

      const stream2 = createMockIterator();
      mockSubscribe.mockResolvedValue(stream2.iterator);

      act(() => {
        result.current.reconnect();
      });

      expect(result.current.connectionState).toBe('connecting');
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
    });
  });
});
