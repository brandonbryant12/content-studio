import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useSSE } from '../use-sse';

// Mock the environment
vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3000',
    PUBLIC_SERVER_API_PATH: '/api',
  },
}));

// Mock SSE handlers
vi.mock('../sse-handlers', () => ({
  handleJobCompletion: vi.fn(),
  handleEntityChange: vi.fn(),
}));

import { handleJobCompletion, handleEntityChange } from '../sse-handlers';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  withCredentials: boolean;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  close = vi.fn(() => {
    this.readyState = 2;
  });

  // Test helpers
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror();
    }
  }

  static reset() {
    MockEventSource.instances = [];
  }

  static getLatest(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

// @ts-expect-error - Mocking global EventSource
global.EventSource = MockEventSource;

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
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    MockEventSource.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    queryClient.clear();
  });

  describe('connection lifecycle', () => {
    it('starts in disconnected state when disabled', () => {
      const { result } = renderHook(() => useSSE({ enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('creates EventSource when enabled', () => {
      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.getLatest()?.url).toBe(
        'http://localhost:3000/api/events',
      );
      expect(MockEventSource.getLatest()?.withCredentials).toBe(true);
    });

    it('transitions to connecting state when enabled', () => {
      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionState).toBe('connecting');
    });

    it('transitions to connected state on connected event', () => {
      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const eventSource = MockEventSource.getLatest()!;

      act(() => {
        eventSource.simulateMessage(
          JSON.stringify({ type: 'connected', userId: 'user-123' }),
        );
      });

      expect(result.current.connectionState).toBe('connected');
    });

    it('closes EventSource on unmount', () => {
      const { unmount } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const eventSource = MockEventSource.getLatest()!;

      unmount();

      expect(eventSource.close).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('handles job_completion events', async () => {
      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const eventSource = MockEventSource.getLatest()!;
      const event = {
        type: 'job_completion',
        jobId: 'job-123',
        jobType: 'generate-podcast',
        status: 'completed',
        podcastId: 'podcast-456',
      };

      act(() => {
        eventSource.simulateMessage(JSON.stringify(event));
      });

      expect(handleJobCompletion).toHaveBeenCalledWith(event, queryClient);
    });

    it('handles entity_change events', async () => {
      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const eventSource = MockEventSource.getLatest()!;
      const event = {
        type: 'entity_change',
        entityType: 'podcast',
        changeType: 'update',
        entityId: 'podcast-123',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
      };

      act(() => {
        eventSource.simulateMessage(JSON.stringify(event));
      });

      expect(handleEntityChange).toHaveBeenCalledWith(event, queryClient);
    });

    it('ignores heartbeat messages', () => {
      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const eventSource = MockEventSource.getLatest()!;

      act(() => {
        eventSource.simulateMessage(':heartbeat');
      });

      expect(handleJobCompletion).not.toHaveBeenCalled();
      expect(handleEntityChange).not.toHaveBeenCalled();
    });

    it('handles malformed JSON gracefully', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      const eventSource = MockEventSource.getLatest()!;

      act(() => {
        eventSource.simulateMessage('not valid json');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SSE] Failed to parse event:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('reconnection', () => {
    it('reconnects on error with exponential backoff', async () => {
      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      expect(MockEventSource.instances).toHaveLength(1);
      const firstEventSource = MockEventSource.getLatest()!;

      // Simulate error
      act(() => {
        firstEventSource.simulateError();
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(firstEventSource.close).toHaveBeenCalled();

      // First reconnect attempt after ~1000ms base delay + jitter
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(MockEventSource.instances).toHaveLength(2);
    });

    it('transitions to error state after max attempts', () => {
      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      // RECONNECT_MAX_ATTEMPTS is 10, meaning we retry 10 times after initial failure
      // Initial connection: attempt 0
      // After error, attempts becomes 1-10
      // When attempts reaches 10, the 11th error will trigger 'error' state
      for (let i = 0; i <= 10; i++) {
        const eventSource = MockEventSource.getLatest()!;

        act(() => {
          eventSource.simulateError();
        });

        // Advance time to trigger next reconnect (only if not at max attempts yet)
        if (i < 10) {
          act(() => {
            vi.advanceTimersByTime(60000);
          });
        }
      }

      expect(result.current.connectionState).toBe('error');
    });

    it('resets reconnect attempts on successful connection', () => {
      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      // Simulate a few errors
      for (let i = 0; i < 3; i++) {
        const eventSource = MockEventSource.getLatest()!;

        act(() => {
          eventSource.simulateError();
        });

        act(() => {
          vi.advanceTimersByTime(10000);
        });
      }

      // Now simulate successful connection
      const eventSource = MockEventSource.getLatest()!;
      act(() => {
        eventSource.simulateMessage(
          JSON.stringify({ type: 'connected', userId: 'user-123' }),
        );
      });

      expect(result.current.connectionState).toBe('connected');

      // Simulate another error - should reconnect (not be at max attempts)
      act(() => {
        eventSource.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should have created a new connection (not given up)
      const latestEventSource = MockEventSource.getLatest()!;
      expect(latestEventSource).not.toBe(eventSource);
    });

    it('manual reconnect resets attempt counter and reconnects', () => {
      const { result } = renderHook(() => useSSE({ enabled: true }), {
        wrapper: createWrapper(),
      });

      // Exhaust attempts to get to error state (need 11 errors total)
      for (let i = 0; i <= 10; i++) {
        const eventSource = MockEventSource.getLatest()!;
        act(() => {
          eventSource.simulateError();
        });
        if (i < 10) {
          act(() => {
            vi.advanceTimersByTime(60000);
          });
        }
      }

      expect(result.current.connectionState).toBe('error');
      const instanceCountBeforeReconnect = MockEventSource.instances.length;

      // Manual reconnect
      act(() => {
        result.current.reconnect();
      });

      expect(MockEventSource.instances.length).toBe(
        instanceCountBeforeReconnect + 1,
      );
      expect(result.current.connectionState).toBe('connecting');
    });
  });

  describe('callback notifications', () => {
    it('calls onConnectionChange when state changes', () => {
      const onConnectionChange = vi.fn();

      renderHook(() => useSSE({ enabled: true, onConnectionChange }), {
        wrapper: createWrapper(),
      });

      expect(onConnectionChange).toHaveBeenCalledWith('connecting');

      const eventSource = MockEventSource.getLatest()!;
      act(() => {
        eventSource.simulateMessage(
          JSON.stringify({ type: 'connected', userId: 'user-123' }),
        );
      });

      expect(onConnectionChange).toHaveBeenCalledWith('connected');
    });
  });
});
