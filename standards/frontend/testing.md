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
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
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

// For components that use router hooks (useNavigate, useParams, etc.)
export function renderWithRouter(
  ui: React.ReactElement,
  { route = '/', ...options }: { route?: string } & Omit<RenderOptions, 'wrapper'> = {}
) {
  const queryClient = createTestQueryClient();

  // Create a minimal test router
  const testRouter = createRouter({
    history: createMemoryHistory({ initialEntries: [route] }),
    routeTree: rootRoute.addChildren([
      // Add test routes as needed
    ]),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
    options
  );
}

export * from '@testing-library/react';
export { renderWithProviders as render };
export { TestWrapper };
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

const API_URL = 'http://localhost:3035/api';

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
      segments: [
        { speaker: 'Host', line: 'Hello!', index: 0 },
      ],
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

const API_URL = 'http://localhost:3035/api';

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

---

## What to Test Checklist

Use these checklists when implementing tests for a feature. Not every test is required for every component, but consider each one.

### List Components

```typescript
describe('PodcastList', () => {
  // Required tests
  it('shows loading state while fetching');
  it('renders list items when data loads');
  it('shows empty state when no items');
  it('shows error state on API failure');

  // If applicable
  it('filters items when searching');
  it('sorts items when sort option changes');
  it('paginates when more items available');
  it('handles item deletion');
  it('navigates to detail on item click');
});
```

### Form Components

```typescript
describe('CreatePodcastForm', () => {
  // Required tests
  it('submits with valid data');
  it('shows validation errors for invalid input');
  it('disables submit button while submitting');
  it('shows error toast on API failure');

  // If applicable
  it('shows success toast on completion');
  it('resets form after successful submit');
  it('preserves input on validation error');
  it('handles file upload');
});
```

### Detail/View Components

```typescript
describe('PodcastDetail', () => {
  // Required tests
  it('displays data correctly');
  it('shows loading state');
  it('shows error state for not found');

  // If applicable
  it('handles edit mode toggle');
  it('shows confirmation before delete');
  it('navigates back after delete');
});
```

### Edit Components

```typescript
describe('PodcastEditor', () => {
  // Required tests
  it('loads existing data');
  it('tracks unsaved changes');
  it('saves changes on submit');
  it('shows error on save failure');

  // If applicable
  it('warns before leaving with unsaved changes');
  it('supports keyboard shortcuts (Cmd+S)');
  it('shows optimistic update');
  it('rolls back on error');
});
```

### Hook Tests

```typescript
describe('usePodcastSettings', () => {
  // Required tests
  it('initializes with default/provided values');
  it('updates state correctly');
  it('tracks hasChanges flag');

  // If applicable
  it('resets to initial values');
  it('validates input');
  it('debounces updates');
});
```

---

## E2E Testing

E2E tests use Playwright to test complete user flows in a real browser.

### Prerequisites

```bash
# Start test database (required for E2E tests)
docker compose -f docker-compose.test.yml up -d
```

### File Organization

```
apps/web/e2e/
├── global-setup.ts              # Create test user, save auth state
├── seed.ts                      # Seed test database
├── fixtures/
│   └── index.ts                 # Custom fixtures
├── pages/
│   ├── base.page.ts             # Common page methods
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── podcasts.page.ts
├── utils/
│   └── api.ts                   # API helpers for test data
└── tests/
    ├── auth/
    │   ├── login.spec.ts
    │   └── protected-routes.spec.ts
    └── podcasts/
        ├── create.spec.ts
        └── workbench.spec.ts
```

### Test User Setup

```typescript
// e2e/seed.ts

export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
  name: 'E2E Test User',
};

export async function seedTestUser() {
  const response = await fetch('http://localhost:3035/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });

  // Handle case where user already exists
  if (!response.ok && response.status !== 409) {
    throw new Error('Failed to seed test user');
  }
}
```

### Global Setup with Auth State

```typescript
// e2e/global-setup.ts

import { chromium, FullConfig } from '@playwright/test';
import { seedTestUser, TEST_USER } from './seed';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;

  // Seed test user
  await seedTestUser();

  // Login and save auth state
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  // Save auth state for reuse
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
}
```

### Page Object Model

```typescript
// e2e/pages/base.page.ts

import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  // Common toast assertions
  async expectSuccessToast(message: string) {
    await expect(this.page.locator('[data-sonner-toast]')).toContainText(message);
  }

  async expectErrorToast(message: string) {
    await expect(this.page.locator('[data-sonner-toast][data-type="error"]')).toContainText(message);
  }

  // Wait for loading to complete
  async waitForLoaded() {
    await this.page.waitForLoadState('networkidle');
  }
}
```

```typescript
// e2e/pages/login.page.ts

import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput = this.page.getByLabel('Email');
  readonly passwordInput = this.page.getByLabel('Password');
  readonly signInButton = this.page.getByRole('button', { name: 'Sign in' });

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL('**/dashboard');
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
```

### Custom Fixtures

```typescript
// e2e/fixtures/index.ts

import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import path from 'path';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

// Authenticated test - uses saved auth state
export const authenticatedTest = test.extend({
  storageState: path.join(__dirname, '../.auth/user.json'),
});

export { expect };
```

### Selector Best Practices

**Use specific selectors to avoid matching multiple elements:**

```typescript
// WRONG - matches multiple elements (page title, nav links, code snippets)
await expect(page.getByText('Podcasts')).toBeVisible();

// CORRECT - use role with level for headings
await expect(page.getByRole('heading', { name: 'Podcasts', level: 1 })).toBeVisible();

// CORRECT - use exact match for buttons
this.createButton = page.getByRole('button', { name: 'Create New' });

// WRONG - regex matches both navbar and form footer links
this.signUpLink = page.getByRole('link', { name: /sign up/i });

// CORRECT - scope to specific container
this.signUpLink = page.locator('.auth-footer').getByRole('link', { name: /sign up/i });
```

**Common selector patterns:**

```typescript
// Page titles - use heading role with level
page.getByRole('heading', { name: 'Dashboard', level: 1 })

// Buttons - use exact name when possible
page.getByRole('button', { name: 'Create New' })

// Links in specific areas - scope with locator
page.locator('.auth-footer').getByRole('link', { name: /sign up/i })

// Empty state headings (often h3)
page.getByRole('heading', { name: /no podcasts/i })
```

### E2E Test Examples

```typescript
// e2e/tests/auth/login.spec.ts

import { test, expect } from '../../fixtures';
import { TEST_USER } from '../../seed';

test.describe('Login', () => {
  test('successful login redirects to dashboard', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await loginPage.expectRedirectToDashboard();
  });

  test('shows validation error for invalid email', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.emailInput.fill('invalid');
    await loginPage.emailInput.blur();
    await loginPage.expectValidationError('valid email');
  });

  test('shows error for wrong credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('wrong@email.com', 'wrongpassword');
    await loginPage.expectErrorToast('Invalid');
  });
});
```

```typescript
// e2e/tests/auth/protected-routes.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('allows access to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
  });
});
```

```typescript
// e2e/tests/podcasts/create.spec.ts

import { authenticatedTest as test, expect } from '../../fixtures';

test.describe('Create Podcast', () => {
  test('creates new podcast and navigates to workbench', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.page.getByRole('button', { name: 'Create New' }).click();

    // Should navigate to new podcast
    await dashboardPage.page.waitForURL(/podcasts\/[a-f0-9-]+/);
    await expect(dashboardPage.page.getByText('Untitled Podcast')).toBeVisible();
  });
});
```

### API Helpers for Test Data

Create API helpers for test setup/teardown:

```typescript
// e2e/utils/api.ts

import { type APIRequestContext } from '@playwright/test';

export class ApiHelper {
  constructor(
    private request: APIRequestContext,
    private baseURL: string
  ) {}

  private get apiURL(): string {
    return `${this.baseURL}/api`;
  }

  // Use proper RESTful methods and paths
  private async get<T>(path: string): Promise<T> {
    const response = await this.request.get(`${this.apiURL}${path}`);
    if (!response.ok()) {
      throw new Error(`GET ${path} failed: ${response.status()}`);
    }
    return response.json();
  }

  private async post<T>(path: string, data?: object): Promise<T> {
    const response = await this.request.post(`${this.apiURL}${path}`, {
      data: data ?? {},
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`POST ${path} failed: ${response.status()}`);
    }
    return response.json();
  }

  // Handle 404 gracefully (already deleted)
  private async delete(path: string): Promise<boolean> {
    const response = await this.request.delete(`${this.apiURL}${path}`);
    if (response.status() === 404) {
      return false; // Already deleted
    }
    if (!response.ok()) {
      throw new Error(`DELETE ${path} failed: ${response.status()}`);
    }
    return true;
  }

  // Cleanup helpers - handle race conditions
  async deleteAllPodcasts(): Promise<void> {
    const podcasts = await this.get<{ id: string }[]>('/podcasts');
    for (const podcast of podcasts) {
      try {
        await this.delete(`/podcasts/${podcast.id}`);
      } catch {
        // Ignore errors - may have been deleted by parallel test
      }
    }
  }
}
```

**Key patterns:**

1. **Use RESTful paths** - Match your API structure (`/api/podcasts`, not `/rpc/podcasts.list`)
2. **Handle 404 as success** - Item may already be deleted
3. **Wrap cleanup in try-catch** - Tests run in parallel and may race

### E2E Test Checklist

When implementing E2E tests for a feature:

```typescript
// Auth flows
- [ ] Login with valid credentials
- [ ] Login validation errors
- [ ] Protected route redirects
- [ ] Logout clears session

// CRUD operations
- [ ] Create new item
- [ ] View item details
- [ ] Edit item
- [ ] Delete item with confirmation

// User flows
- [ ] Complete multi-step wizard
- [ ] Search and filter
- [ ] Navigate between pages
- [ ] Keyboard shortcuts work
```

### E2E Anti-Patterns

```typescript
// WRONG - getByText matches too many elements
await expect(page.getByText('Documents')).toBeVisible();

// CORRECT - use specific role and level
await expect(page.getByRole('heading', { name: 'Documents', level: 1 })).toBeVisible();


// WRONG - regex matches multiple buttons
this.createButton = page.getByRole('button', { name: /create/i });

// CORRECT - use exact text when multiple similar buttons exist
this.createButton = page.getByRole('button', { name: 'Create New' });


// WRONG - cleanup doesn't handle parallel test races
async deleteAllPodcasts() {
  const podcasts = await this.listPodcasts();
  for (const podcast of podcasts) {
    await this.deletePodcast(podcast.id); // Throws if already deleted
  }
}

// CORRECT - ignore errors from race conditions
async deleteAllPodcasts() {
  const podcasts = await this.listPodcasts();
  for (const podcast of podcasts) {
    try {
      await this.deletePodcast(podcast.id);
    } catch {
      // May have been deleted by another test
    }
  }
}


// WRONG - testing struct-level form validation by looking for error text
await registerPage.fill('Test', 'test@example.com', 'password123', 'different123');
await registerPage.confirmPasswordInput.blur();
await expect(page.getByText('Passwords do not match')).toBeVisible();

// CORRECT - struct-level validation may disable submit instead of showing text
await registerPage.fill('Test', 'test@example.com', 'password123', 'different123');
await registerPage.confirmPasswordInput.blur();
await expect(registerPage.submitButton).toBeDisabled();
```

### Running E2E Tests

```bash
# Run all E2E tests
pnpm --filter web test:e2e

# Run with UI for debugging
pnpm --filter web test:e2e:ui

# Run specific test file
pnpm --filter web exec playwright test tests/auth/login.spec.ts

# View HTML report
pnpm --filter web exec playwright show-report
```
