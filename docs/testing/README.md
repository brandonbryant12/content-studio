# Testing Architecture

Content Studio uses a **testing pyramid** approach with three layers:

```
        /\
       /E2E\        ← Few critical user flows (Playwright)
      /------\
     /Integration\   ← API + DB + Worker tests (real DB, mocked AI)
    /--------------\
   /   Unit Tests   \ ← Fast, isolated logic tests (Vitest)
  /------------------\
```

## Quick Reference

```bash
# Unit tests
pnpm test                    # Run all unit tests
pnpm test:watch              # Watch mode

# E2E tests (fully automated - starts servers automatically)
pnpm test:db:setup           # First time: start test DB + run migrations
pnpm test:e2e                # Run E2E tests (auto-starts server + web app)
pnpm test:e2e:ui             # Run with Playwright UI

# Manual E2E setup (if needed)
pnpm e2e:seed                # Seed test user (after server is running)

# Test database management
pnpm test:db:up              # Start test database container
pnpm test:db:down            # Stop test database container
pnpm test:db:setup           # Start DB + push schema

# Integration tests (requires Docker)
pnpm test:integration        # Run integration tests
```

## Test Structure

```
packages/
  testing/                   # Shared test utilities
    src/
      mocks/                 # Mock Effect layers
        llm.ts               # MockLLMLive
        tts.ts               # MockTTSLive
        storage.ts           # InMemoryStorageLive
      factories/             # Test data factories
        user.ts
        document.ts
        podcast.ts
      setup/                 # Test context utilities
        database.ts          # Transaction rollback helpers
        layers.ts            # Test layer compositions

apps/web/
  e2e/
    fixtures/                # Playwright helpers
      auth.ts                # Login/logout
      api.ts                 # API client for test data
    tests/                   # E2E test files
      podcast-generation.spec.ts
    seed.ts                  # Test user seeding script
  playwright.config.ts
```

## Unit Tests (Vitest)

Unit tests are fast, isolated tests for pure logic.

**Location**: `packages/*/src/__tests__/`

**When to use**:
- Testing pure functions
- Testing serializers and validators
- Testing prompt templates
- Testing utility functions

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { serializePodcast } from '../serializers';

describe('serializePodcast', () => {
  it('converts dates to ISO strings', () => {
    const podcast = createTestPodcast({ createdAt: new Date('2024-01-01') });
    const result = serializePodcast(podcast);
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });
});
```

## Integration Tests

Integration tests verify that components work together correctly with a real database.

**When to use**:
- Testing API handlers end-to-end
- Testing database operations
- Testing worker job processing
- Testing service layer logic

**Test isolation**: Uses transaction rollback to ensure each test starts with clean state.

**Example**:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, type TestContext } from '@repo/testing';
import { MockLLMLive, MockTTSLive } from '@repo/testing/mocks';

describe('podcast generation', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  it('generates script and stores in database', async () => {
    const podcast = await ctx.factories.podcast.create();

    await Effect.runPromise(
      generator.generateScript(podcast.id).pipe(
        Effect.provide(Layer.mergeAll(ctx.dbLayer, MockLLMLive, MockTTSLive))
      )
    );

    const updated = await ctx.db.query.podcasts.findFirst({
      where: eq(podcasts.id, podcast.id)
    });
    expect(updated?.status).toBe('script_ready');
  });
});
```

## E2E Tests (Playwright)

E2E tests verify critical user flows in a real browser.

**Location**: `apps/web/e2e/`

**When to use**:
- Testing complete user workflows
- Testing UI interactions
- Testing authentication flows
- Smoke testing deployments

### How It Works

E2E tests are **fully automated**. When you run `pnpm test:e2e`:

1. Playwright starts the **API server** with test configuration:
   - Uses test database (`postgresql://test:test@localhost:5433/content_studio_test`)
   - Mock AI services enabled (`USE_MOCK_AI=true`)
   - Loaded from `apps/server/.env.test`

2. Playwright starts the **web app** (Vite dev server)

3. Tests run against these servers

4. Servers shut down when tests complete

### First-Time Setup

```bash
# 1. Start test database and run migrations
pnpm test:db:setup

# 2. Run E2E tests (servers start automatically)
pnpm test:e2e
```

### Test Configuration

**Server test config** (`apps/server/.env.test`):
```bash
USE_MOCK_AI=true                    # Use mock LLM/TTS
SERVER_POSTGRES_URL=postgresql://test:test@localhost:5433/content_studio_test
```

**Playwright config** (`apps/web/playwright.config.ts`):
- Auto-starts API server: `pnpm --filter server start:test`
- Auto-starts web app: `pnpm dev`
- Reuses existing servers in development (not in CI)

### Test User Credentials

```typescript
// Default test user (created by seed script)
email: 'test@example.com'
password: 'testpassword123'
```

### Writing E2E Tests

**Authentication**:
```typescript
import { test, expect } from '@playwright/test';
import { login } from '../fixtures';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('does something', async ({ page }) => {
    await page.goto('/podcasts');
    // ... test logic
  });
});
```

**API calls with authentication** (use `page.request` to share cookies):
```typescript
import { createDocument, deletePodcast } from '../fixtures';

test('creates data via API', async ({ page }) => {
  // Use page.request (NOT the request fixture) to share auth cookies
  const doc = await createDocument(page.request, {
    title: 'Test Document',
    content: 'Test content...',
  });

  // Cleanup in afterEach
});
```

**Flexible button selectors** (handle different UI states):
```typescript
// Use .or() for buttons that may have different labels
const createButton = page
  .getByRole('button', { name: 'Create New' })
  .or(page.getByRole('button', { name: 'Create Podcast' }));
await createButton.first().click();
```

### Playwright Configuration

Key settings in `apps/web/playwright.config.ts`:
- **Base URL**: `http://localhost:8085` (or `E2E_BASE_URL` env var)
- **API URL**: `http://localhost:3035` (or `E2E_API_URL` env var)
- **Browser**: Chromium only (can enable Firefox/WebKit)
- **Timeout**: 30 seconds per test
- **Screenshots**: On failure only
- **Traces**: On first retry

## Mock Layers

The `@repo/testing` package provides mock Effect layers for external services.

### MockLLMLive

Returns fixed podcast script without calling real AI:

```typescript
import { MockLLMLive, createMockLLM } from '@repo/testing/mocks';

// Use default mock
Effect.provide(myEffect, MockLLMLive);

// Customize response
const customMock = createMockLLM({
  delay: 100,  // Simulate latency
  response: { /* custom script */ },
});
```

### MockTTSLive

Returns silent audio buffer:

```typescript
import { MockTTSLive, createMockTTS } from '@repo/testing/mocks';

// Returns valid WAV audio (silent)
Effect.provide(myEffect, MockTTSLive);
```

### InMemoryStorageLive

In-memory file storage:

```typescript
import { createInMemoryStorage } from '@repo/testing/mocks';

const { layer, store, clear } = createInMemoryStorage();
// store is a Map<string, Buffer> for inspection
// clear() resets storage between tests
```

## Test Data Factories

Factories create valid test entities with sensible defaults:

```typescript
import { createTestUser, createTestDocument, createTestPodcast } from '@repo/testing/factories';

// Create with defaults
const user = createTestUser();

// Override specific fields
const podcast = createTestPodcast({
  title: 'My Test Podcast',
  status: 'script_ready',
});
```

## Docker Test Database

For integration tests, use the isolated test database:

```yaml
# docker-compose.test.yml
services:
  db-test:
    image: postgres:18
    ports:
      - "5433:5432"  # Different port than dev
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: content_studio_test
    tmpfs:
      - /var/lib/postgresql  # RAM disk for speed (note: PG 18+ requires this path)
```

```bash
# Start test database
docker compose -f docker-compose.test.yml up -d

# Run migrations
DB_POSTGRES_URL=postgresql://test:test@localhost:5433/content_studio_test pnpm db:push

# Run integration tests
pnpm test:integration

# Stop test database
docker compose -f docker-compose.test.yml down
```

## Best Practices

### Do

- Use `page.request` (not `request` fixture) in Playwright for authenticated API calls
- Use transaction rollback for database isolation in integration tests
- Create test data via API/factories, not by navigating UI
- Use specific selectors (exact button names > regex patterns)
- Clean up created resources in `afterEach`

### Don't

- Don't test implementation details, test behavior
- Don't share state between tests
- Don't use `test.only` in committed code
- Don't hardcode waits - use Playwright's auto-waiting
- Don't test external services (mock them)

## Troubleshooting

### E2E tests fail with "401 Unauthorized"

**Cause**: API fixture using wrong request context.

**Fix**: Use `page.request` instead of the `request` fixture:
```typescript
// Wrong
const doc = await createDocument(request, { ... });

// Correct
const doc = await createDocument(page.request, { ... });
```

### E2E tests fail with "strict mode violation"

**Cause**: Selector matches multiple elements.

**Fix**: Make selector more specific or use `.first()`:
```typescript
// Use exact name
await page.getByRole('button', { name: 'Create Podcast' }).click();

// Or use .or() with .first()
const btn = page.getByRole('button', { name: 'A' }).or(page.getByRole('button', { name: 'B' }));
await btn.first().click();
```

### Tests are slow

- Use API calls to create test data instead of UI navigation
- Run tests in parallel (Playwright default)
- Use mocked external services
- Use RAM disk for test database (tmpfs)

### Database state leaking between tests

**Fix**: Ensure `afterEach` calls `ctx.rollback()` and cleans up resources:
```typescript
test.afterEach(async ({ page }) => {
  if (podcastId) {
    await deletePodcast(page.request, podcastId).catch(() => {});
    podcastId = undefined;
  }
});
```
