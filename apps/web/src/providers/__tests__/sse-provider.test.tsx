import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEProvider, useSSEContext, useSSERecovery } from '../sse-provider';

// Mock the environment
vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3000',
    PUBLIC_SERVER_API_PATH: '/api',
  },
}));

// Mock SSE handlers
vi.mock('@/shared/hooks/sse-handlers', () => ({
  handleJobCompletion: vi.fn(),
  handleEntityChange: vi.fn(),
}));

// Mock auth client
const mockUseSession = vi.fn();
vi.mock('@/clients/authClient', () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

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

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('connects when user is authenticated', () => {
      mockUseSession.mockReturnValue({ data: { user: { id: 'user-123' } } });

      renderHook(() => useSSEContext(), {
        wrapper: createWrapper(),
      });

      expect(MockEventSource.instances).toHaveLength(1);
    });
  });

  describe('useSSERecovery', () => {
    it('invalidates all queries when reconnected after disconnection', () => {
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
      const eventSource = MockEventSource.getLatest()!;
      act(() => {
        eventSource.simulateMessage(
          JSON.stringify({ type: 'connected', userId: 'user-123' }),
        );
      });

      // Clear calls from initial connection (if any)
      invalidateSpy.mockClear();

      // Simulate disconnect (error triggers close and schedules reconnect)
      act(() => {
        eventSource.simulateError();
      });

      // Advance time to trigger reconnect
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Now we have a new EventSource. Simulate successful reconnection.
      const newEventSource = MockEventSource.getLatest()!;
      act(() => {
        newEventSource.simulateMessage(
          JSON.stringify({ type: 'connected', userId: 'user-123' }),
        );
      });

      // The recovery hook should have invalidated queries when transitioning
      // from 'disconnected' to 'connected'
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
