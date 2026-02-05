import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { SSEProvider, useSSEContext, useSSERecovery } from '../sse-provider';

// Mock SSE handlers
vi.mock('@/shared/hooks/sse-handlers', () => ({
  handleJobCompletion: vi.fn(),
  handleVoiceoverJobCompletion: vi.fn(),
  handleEntityChange: vi.fn(),
}));

// Mock auth client
const mockUseSession = vi.fn();
vi.mock('@/clients/authClient', () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
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

describe('SSEProvider', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(SSEProvider, null, children),
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

  describe('useSSEContext', () => {
    it('throws error when used outside SSEProvider', () => {
      expect(() => {
        renderHook(() => useSSEContext(), {
          wrapper: ({ children }) =>
            createElement(
              QueryClientProvider,
              { client: queryClient },
              children,
            ),
        });
      }).toThrow('useSSEContext must be used within SSEProvider');
    });

    it('returns connection state and reconnect function', () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);
      mockUseSession.mockReturnValue({ data: { user: { id: 'user-123' } } });

      const { result } = renderHook(() => useSSEContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionState).toBe('connecting');
      expect(typeof result.current.reconnect).toBe('function');
    });
  });

  describe('authentication-based enabling', () => {
    it('does not connect when user is not authenticated', () => {
      mockUseSession.mockReturnValue({ data: null });

      renderHook(() => useSSEContext(), {
        wrapper: createWrapper(),
      });

      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it('connects when user is authenticated', () => {
      const mock = createMockIterator();
      mockSubscribe.mockResolvedValue(mock.iterator);
      mockUseSession.mockReturnValue({ data: { user: { id: 'user-123' } } });

      renderHook(() => useSSEContext(), {
        wrapper: createWrapper(),
      });

      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  describe('useSSERecovery', () => {
    it('invalidates all queries when reconnected after disconnection', async () => {
      const mock1 = createMockIterator();
      const mock2 = createMockIterator();
      mockSubscribe
        .mockResolvedValueOnce(mock1.iterator)
        .mockResolvedValueOnce(mock2.iterator);
      mockUseSession.mockReturnValue({ data: { user: { id: 'user-123' } } });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderHook(
        () => {
          useSSEContext();
          useSSERecovery();
        },
        { wrapper: createWrapper() },
      );

      // Get connected first
      await act(async () => {
        mock1.push({ type: 'connected', userId: 'user-123' });
      });

      // Clear calls from initial connection
      invalidateSpy.mockClear();

      // Simulate disconnect by ending the stream
      await act(async () => {
        mock1.fail(new Error('Connection lost'));
      });

      // Wait for reconnect delay
      await act(async () => {
        await new Promise((r) => setTimeout(r, 3000));
      });

      // Simulate successful reconnection on new stream
      await act(async () => {
        mock2.push({ type: 'connected', userId: 'user-123' });
      });

      // The recovery hook should have invalidated queries
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled();
      });
    });
  });
});
