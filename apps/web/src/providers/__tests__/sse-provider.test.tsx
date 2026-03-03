import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEProvider, useSSEContext, useSSERecovery } from '../sse-provider';

// Mock SSE handlers
vi.mock('@/shared/hooks/sse-handlers', () => ({
  handleJobCompletion: vi.fn(),
  handleVoiceoverJobCompletion: vi.fn(),
  handleInfographicJobCompletion: vi.fn(),
  handleDocumentJobCompletion: vi.fn(),
  handleEntityChange: vi.fn(),
  handleActivityLogged: vi.fn(),
  setNavigateFn: vi.fn(),
}));

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    history: { push: vi.fn() },
  }),
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

const AUTHENTICATED_SESSION = { data: { user: { id: 'user-123' } } };

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

  const setAuthenticated = () => {
    mockUseSession.mockReturnValue(AUTHENTICATED_SESSION);
  };

  const renderWithSSEContext = () =>
    renderHook(() => useSSEContext(), {
      wrapper: createWrapper(),
    });

  it('throws error when used outside SSEProvider', () => {
    expect(() => {
      renderHook(() => useSSEContext(), {
        wrapper: ({ children }) =>
          createElement(QueryClientProvider, { client: queryClient }, children),
      });
    }).toThrow('useSSEContext must be used within SSEProvider');
  });

  it('returns initial connection state', () => {
    const mock = createMockIterator();
    mockSubscribe.mockResolvedValue(mock.iterator);
    setAuthenticated();

    const { result } = renderWithSSEContext();

    expect(result.current.connectionState).toBe('connecting');
  });

  it.each([
    {
      isAuthenticated: false,
      session: { data: null },
      expectedCalls: 0,
    },
    {
      isAuthenticated: true,
      session: AUTHENTICATED_SESSION,
      expectedCalls: 1,
    },
  ])(
    'connect behavior follows authentication (isAuthenticated=$isAuthenticated)',
    ({ session, expectedCalls }) => {
      if (expectedCalls === 1) {
        const mock = createMockIterator();
        mockSubscribe.mockResolvedValue(mock.iterator);
      }
      mockUseSession.mockReturnValue(session);

      renderWithSSEContext();

      expect(mockSubscribe).toHaveBeenCalledTimes(expectedCalls);
    },
  );

  it('invalidates all queries when reconnected after disconnection', async () => {
    const mock1 = createMockIterator();
    const mock2 = createMockIterator();
    mockSubscribe
      .mockResolvedValueOnce(mock1.iterator)
      .mockResolvedValueOnce(mock2.iterator);
    setAuthenticated();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(
      () => {
        useSSEContext();
        useSSERecovery();
      },
      { wrapper: createWrapper() },
    );

    await act(async () => {
      mock1.push({ type: 'connected', userId: 'user-123' });
    });
    invalidateSpy.mockClear();

    await act(async () => {
      mock1.fail(new Error('Connection lost'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 3000));
    });
    await act(async () => {
      mock2.push({ type: 'connected', userId: 'user-123' });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
