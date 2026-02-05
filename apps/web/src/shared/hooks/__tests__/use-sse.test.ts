import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleJobCompletion,
  handleVoiceoverJobCompletion,
  handleEntityChange,
} from '../sse-handlers';
import { useSSE } from '../use-sse';

// Mock SSE handlers
vi.mock('../sse-handlers', () => ({
  handleJobCompletion: vi.fn(),
  handleVoiceoverJobCompletion: vi.fn(),
  handleEntityChange: vi.fn(),
}));

// Create a controllable async iterator for mocking the ORPC client
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
      if (error) {
        throw error;
      }
      if (events.length > 0) {
        return { value: events.shift()!, done: false };
      }
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

// Mock the raw API client
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

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
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

    it('calls subscribe when enabled', () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('transitions to connecting state when enabled', () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionState).toBe('connecting');
    });

    it('transitions to connected state on connected event', async () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        mock.push({ type: 'connected', userId: 'user-123' });
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });
    });

    it('aborts on unmount', async () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      const { unmount } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      unmount();

      // Verify signal was passed
      const callArgs = mockSubscribe.mock.calls[0]!;
      expect(callArgs[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(callArgs[1]!.signal.aborted).toBe(true);
    });
  });

  describe('event handling', () => {
    it('handles job_completion events', async () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const event = {
        type: 'job_completion',
        jobId: 'job-123',
        jobType: 'generate-podcast',
        status: 'completed',
        podcastId: 'podcast-456',
      };

      await act(async () => {
        mock.push(event);
      });

      await waitFor(() => {
        expect(handleJobCompletion).toHaveBeenCalledWith(event, queryClient);
      });
    });

    it('handles entity_change events', async () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const event = {
        type: 'entity_change',
        entityType: 'podcast',
        changeType: 'update',
        entityId: 'podcast-123',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        mock.push(event);
      });

      await waitFor(() => {
        expect(handleEntityChange).toHaveBeenCalledWith(event, queryClient);
      });
    });

    it('handles voiceover_job_completion events', async () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const event = {
        type: 'voiceover_job_completion',
        jobId: 'job-123',
        jobType: 'generate-voiceover',
        status: 'completed',
        voiceoverId: 'voiceover-456',
      };

      await act(async () => {
        mock.push(event);
      });

      await waitFor(() => {
        expect(handleVoiceoverJobCompletion).toHaveBeenCalledWith(
          event,
          queryClient,
        );
      });
    });
  });

  describe('reconnection', () => {
    it('reconnects when stream ends', async () => {
      const mock1 = createMockIterator();
      const mock2 = createMockIterator();
      mockSubscribe
        .mockResolvedValueOnce(mock1.iterator)
        .mockResolvedValueOnce(mock2.iterator);

      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      // End the first stream
      await act(async () => {
        mock1.end();
      });

      // Wait for reconnect delay + call
      await act(async () => {
        await new Promise((r) => setTimeout(r, 3000));
      });

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledTimes(2);
      });
    });

    it('sets disconnected state when stream errors', async () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      // Simulate stream error
      await act(async () => {
        mock.fail(new Error('Stream failed'));
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected');
      });
    });

    it('reconnect triggers new subscribe call', async () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);

      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      expect(mockSubscribe).toHaveBeenCalledTimes(1);

      // Manual reconnect creates new connection
      const mock2 = createMockIterator();
      mockSubscribe.mockResolvedValue(mock2.iterator);

      act(() => {
        result.current.reconnect();
      });

      expect(result.current.connectionState).toBe('connecting');
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
    });
  });
});
