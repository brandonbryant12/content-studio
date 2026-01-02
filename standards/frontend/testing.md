# Testing

This document defines testing patterns for Content Studio frontend.

## Overview

We use two types of tests:

| Type | Tools | Speed | Use Case |
|------|-------|-------|----------|
| **Component** | Vitest + RTL + MSW | Fast (~seconds) | Isolated component logic, hooks, user interactions |
| **E2E** | Playwright | Slow (~minutes) | Full user flows, auth, real API integration |

### When to Use Each

**Use Component Tests when:**
- Testing a single component's behavior
- Testing hooks in isolation
- Testing form validation
- Testing loading/error states
- You need fast feedback during development

**Use E2E Tests when:**
- Testing complete user flows (login → create → edit → delete)
- Testing auth and protected routes
- Testing real API integration
- Testing navigation between pages
- Verifying critical paths work end-to-end

## Component Testing

Component tests use:
- **Vitest** - Test runner
- **React Testing Library** - Component testing
- **MSW (Mock Service Worker)** - API mocking
- **User-centric assertions** - Test what users see, not implementation

## Test File Organization

```
features/{domain}/
├── components/
├── hooks/
└── __tests__/
    ├── podcast-list.test.tsx
    ├── podcast-detail.test.tsx
    └── handlers.ts              # MSW handlers for this feature
```

## Test Setup

### Test Utilities

```typescript
// test-utils/index.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { type ReactNode } from 'react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface TestWrapperProps {
  children: ReactNode;
}

function TestWrapper({ children }: TestWrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

### MSW Setup

```typescript
// test-utils/server.ts

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// test-utils/setup.ts

import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## MSW Handler Patterns

### Base Handlers

```typescript
// test-utils/handlers.ts

import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api';

export const handlers = [
  // List podcasts
  http.get(`${API_URL}/podcasts`, () => {
    return HttpResponse.json([
      {
        id: 'pod_1',
        title: 'Test Podcast',
        status: 'ready',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Get single podcast
  http.get(`${API_URL}/podcasts/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Podcast',
      status: 'ready',
      activeVersion: {
        status: 'ready',
        segments: [
          { speaker: 'Host', line: 'Hello!', index: 0 },
        ],
      },
    });
  }),

  // Create podcast
  http.post(`${API_URL}/podcasts`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'pod_new',
      ...body,
      status: 'drafting',
      createdAt: new Date().toISOString(),
    });
  }),
];
```

### Feature-Specific Handlers

```typescript
// features/podcasts/__tests__/handlers.ts

import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api';

export const podcastHandlers = {
  listSuccess: http.get(`${API_URL}/podcasts`, () => {
    return HttpResponse.json([
      { id: 'pod_1', title: 'Podcast 1', status: 'ready' },
      { id: 'pod_2', title: 'Podcast 2', status: 'generating' },
    ]);
  }),

  listEmpty: http.get(`${API_URL}/podcasts`, () => {
    return HttpResponse.json([]);
  }),

  listError: http.get(`${API_URL}/podcasts`, () => {
    return HttpResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Server error' },
      { status: 500 }
    );
  }),

  getNotFound: http.get(`${API_URL}/podcasts/:id`, () => {
    return HttpResponse.json(
      { code: 'PODCAST_NOT_FOUND', message: 'Not found' },
      { status: 404 }
    );
  }),

  createSuccess: http.post(`${API_URL}/podcasts`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'pod_new', ...body });
  }),

  createValidationError: http.post(`${API_URL}/podcasts`, () => {
    return HttpResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        data: { title: 'Title is required' },
      },
      { status: 400 }
    );
  }),
};
```

## Integration Test Template

```typescript
// features/podcasts/__tests__/podcast-list.test.tsx

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { server } from '@/test-utils/server';
import { podcastHandlers } from './handlers';
import { PodcastListContainer } from '../components/podcast-list-container';

describe('PodcastListContainer', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('renders podcast list', async () => {
    server.use(podcastHandlers.listSuccess);

    render(<PodcastListContainer />);

    // Shows loading state
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Shows podcasts after loading
    await waitFor(() => {
      expect(screen.getByText('Podcast 1')).toBeInTheDocument();
      expect(screen.getByText('Podcast 2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no podcasts', async () => {
    server.use(podcastHandlers.listEmpty);

    render(<PodcastListContainer />);

    await waitFor(() => {
      expect(screen.getByText(/no podcasts/i)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    server.use(podcastHandlers.listError);

    render(<PodcastListContainer />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Testing User Interactions

```typescript
// features/podcasts/__tests__/create-podcast.test.tsx

import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { server } from '@/test-utils/server';
import { podcastHandlers } from './handlers';
import { CreatePodcastForm } from '../components/create-podcast-form';

describe('CreatePodcastForm', () => {
  const mockOnSubmit = vi.fn();

  it('submits form with valid data', async () => {
    const user = userEvent.setup();

    render(
      <CreatePodcastForm
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'My Podcast');
    await user.click(screen.getByRole('button', { name: /conversation/i }));

    // Submit
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'My Podcast',
        format: 'conversation',
        targetDurationMinutes: 5,
      });
    });
  });

  it('shows validation error for empty title', async () => {
    const user = userEvent.setup();

    render(
      <CreatePodcastForm
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    // Submit without filling
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('disables submit while submitting', () => {
    render(
      <CreatePodcastForm
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />
    );

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });
});
```

## Testing Mutations

```typescript
// features/podcasts/__tests__/podcast-actions.test.tsx

import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { server } from '@/test-utils/server';
import { http, HttpResponse } from 'msw';
import { PodcastDetail } from '../components/podcast-detail';

describe('Podcast Actions', () => {
  const mockPodcast = {
    id: 'pod_1',
    title: 'Test Podcast',
    status: 'ready',
  };

  it('deletes podcast on confirm', async () => {
    const user = userEvent.setup();
    let deleteRequested = false;

    server.use(
      http.delete('/api/podcasts/pod_1', () => {
        deleteRequested = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <PodcastDetail
        podcast={mockPodcast}
        onDelete={() => {}}
        isDeleting={false}
      />
    );

    // Click delete
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // Confirm in dialog
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(deleteRequested).toBe(true);
    });
  });

  it('shows optimistic state during generation', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/podcasts/pod_1/generate', async () => {
        // Delay to see optimistic state
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({ jobId: 'job_1' });
      })
    );

    render(<PodcastDetailWithMutation podcast={mockPodcast} />);

    await user.click(screen.getByRole('button', { name: /generate/i }));

    // Should show generating state immediately (optimistic)
    expect(screen.getByText(/generating/i)).toBeInTheDocument();
  });
});
```

## Testing Async Operations

### Waiting for Queries

```typescript
await waitFor(() => {
  expect(screen.getByText('Podcast Title')).toBeInTheDocument();
});
```

### Waiting for Loading to Complete

```typescript
// Wait for loading state to disappear
await waitFor(() => {
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
```

### Testing Loading States

```typescript
it('shows loading skeleton', async () => {
  server.use(
    http.get('/api/podcasts', async () => {
      await new Promise((r) => setTimeout(r, 100));
      return HttpResponse.json([]);
    })
  );

  render(<PodcastList />);

  // Loading state should be visible
  expect(screen.getByTestId('podcast-skeleton')).toBeInTheDocument();

  // Wait for content
  await waitFor(() => {
    expect(screen.queryByTestId('podcast-skeleton')).not.toBeInTheDocument();
  });
});
```

## Testing Error States

```typescript
it('handles API error gracefully', async () => {
  server.use(
    http.get('/api/podcasts/:id', () => {
      return HttpResponse.json(
        { code: 'PODCAST_NOT_FOUND', message: 'Not found' },
        { status: 404 }
      );
    })
  );

  render(<PodcastDetailContainer podcastId="pod_missing" />);

  await waitFor(() => {
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });
});
```

## Testing Hooks

```typescript
// features/podcasts/__tests__/use-podcast-settings.test.ts

import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { TestWrapper } from '@/test-utils';
import { usePodcastSettings } from '../hooks/use-podcast-settings';

describe('usePodcastSettings', () => {
  const mockPodcast = {
    id: 'pod_1',
    hostVoice: 'Aoede',
    coHostVoice: 'Charon',
    targetDurationMinutes: 5,
  };

  it('initializes with podcast values', () => {
    const { result } = renderHook(
      () => usePodcastSettings({ podcast: mockPodcast }),
      { wrapper: TestWrapper }
    );

    expect(result.current.hostVoice).toBe('Aoede');
    expect(result.current.coHostVoice).toBe('Charon');
    expect(result.current.hasChanges).toBe(false);
  });

  it('tracks changes', () => {
    const { result } = renderHook(
      () => usePodcastSettings({ podcast: mockPodcast }),
      { wrapper: TestWrapper }
    );

    act(() => {
      result.current.setHostVoice('Kore');
    });

    expect(result.current.hostVoice).toBe('Kore');
    expect(result.current.hasChanges).toBe(true);
  });

  it('discards changes', () => {
    const { result } = renderHook(
      () => usePodcastSettings({ podcast: mockPodcast }),
      { wrapper: TestWrapper }
    );

    act(() => {
      result.current.setHostVoice('Kore');
      result.current.discardChanges();
    });

    expect(result.current.hostVoice).toBe('Aoede');
    expect(result.current.hasChanges).toBe(false);
  });
});
```

## Anti-Patterns

### Testing Implementation Details

```typescript
// WRONG - testing state management internals
expect(component.state.isLoading).toBe(true);
expect(queryClient.getQueryData(['podcasts'])).toEqual([...]);

// CORRECT - test what user sees
expect(screen.getByRole('status')).toBeInTheDocument();
await waitFor(() => {
  expect(screen.getByText('Podcast Title')).toBeInTheDocument();
});
```

### Not Waiting for Async

```typescript
// WRONG - flaky test
render(<PodcastList />);
expect(screen.getByText('Podcast 1')).toBeInTheDocument();

// CORRECT - wait for async operations
render(<PodcastList />);
await waitFor(() => {
  expect(screen.getByText('Podcast 1')).toBeInTheDocument();
});
```

### Hardcoded Handlers

```typescript
// WRONG - modifying global handlers
handlers.push(http.get('/api/podcasts', () => {...}));

// CORRECT - use server.use() for test-specific overrides
server.use(podcastHandlers.listEmpty);
```

### No Error Case Tests

```typescript
// WRONG - only testing happy path
it('renders list', async () => {
  // Only success case
});

// CORRECT - test error cases too
it('shows error on failure', async () => {
  server.use(podcastHandlers.listError);
  // Verify error handling
});
```

### Testing React Query Internals

```typescript
// WRONG
expect(queryClient.isFetching()).toBe(1);

// CORRECT - test the UI result
expect(screen.getByRole('status')).toHaveTextContent('Loading');
```
