// test-utils/index.tsx
// Custom render function with providers for component tests

import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Create a fresh QueryClient for each test
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

interface RenderWithQueryResult extends RenderResult {
  queryClient: QueryClient;
}

/**
 * Simple render with just QueryClient provider.
 * Use this for testing components that use TanStack Query.
 */
export function renderWithQuery(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): RenderWithQueryResult {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: WrapperProps): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    queryClient,
  };
}

// Re-export handlers and server for convenience
export { server } from './server';
export { handlers, createMockPodcast, createMockDocument } from './handlers';
