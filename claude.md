# Content Studio - AI Agent Guide

## Project Overview

Content Studio is a web application for creating and managing multimedia content, primarily AI-generated podcasts from documents. The codebase prioritizes **type safety**, **graceful error handling**, and **simple, readable code**.

## Technology Stack

- **Runtime**: Node.js with TypeScript (strict mode)
- **Backend Framework**: Hono + oRPC
- **Database**: PostgreSQL via Drizzle ORM
- **Effect System**: Effect-TS for typed errors and dependency injection
- **Frontend**: React + TanStack Router + Tailwind CSS
- **AI Services**: Google Gemini for LLM and TTS
- **Testing**: Vitest (unit), Playwright (E2E)

## Monorepo Structure

```
apps/
  server/              # Hono HTTP server + background workers
  web/                 # React frontend (Vite)
    e2e/               # Playwright E2E tests

packages/
  api/                 # oRPC contracts and API handlers
    src/contracts/     # API shape definitions (Valibot schemas)
    src/server/router/ # Handler implementations
  db/                  # Drizzle schemas and database client
    src/schemas/       # Table definitions
  effect/              # Effect utilities
    src/errors.ts      # All error type definitions
    src/db.ts          # Database Effect wrapper
  media/               # Document and Podcast services
  ai/                  # LLM and TTS providers
  storage/             # File storage (filesystem, S3, database)
  queue/               # Background job processing
  project/             # Project management service
  testing/             # Shared test utilities, mocks, factories
  ui/                  # Shared UI components (Button, Badge, etc.)

tools/
  tailwind/
    style.css          # Global CSS - design system & component styles

docs/
  testing/             # Testing documentation
```

## Critical Conventions

### Error Handling

**Always use `handleEffect` with `createErrorHandlers`:**

```typescript
const handlers = createErrorHandlers(errors);
return handleEffect(effect, {
  ...handlers.common,
  ...handlers.database,
  DocumentNotFound: (e) => {
    throw errors.DOCUMENT_NOT_FOUND({ message: e.message, data: { documentId: e.id } });
  },
});
```

**Never:**
- Use `Effect.runPromise` directly without error mapping
- Use `any` types in error handlers
- Silently suppress errors with `Effect.catchAll(() => Effect.void)`
- Use `console.log` for errors - use structured logging with stack traces

### Database Operations

**Always use `withDb` wrapper:**

```typescript
import { withDb } from '@repo/effect/db';

const findById = (id: string) =>
  withDb('entity.findById', (db) =>
    db.select().from(table).where(eq(table.id, id))
  );
```

**Timestamps must be timezone-aware:**

```typescript
createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
```

### Service Layer Pattern

Services follow a three-tier structure:

```typescript
// 1. Interface (Context.Tag)
export class Documents extends Context.Tag('@repo/media/Documents')<
  Documents,
  DocumentsService
>() {}

// 2. Implementation
const make = Effect.gen(function* () {
  const db = yield* Db;
  return {
    findById: (id) => withDb('documents.findById', ...)
  };
});

// 3. Layer
export const DocumentsLive = Layer.effect(Documents, make);
```

### API Handlers

**Structure:**
- Contracts in `packages/api/src/contracts/` define input/output schemas
- Handlers in `packages/api/src/server/router/` implement the logic
- Use `protectedProcedure` for authenticated routes
- Serialize database objects before returning

```typescript
const handler = protectedProcedure.entity.action.handler(
  async ({ context, input, errors }) => {
    const handlers = createErrorHandlers(errors);
    return handleEffect(
      Effect.gen(function* () {
        const service = yield* Service;
        const result = yield* service.action(input);
        return serializeEntity(result);
      }).pipe(Effect.provide(context.layers)),
      { ...handlers.common, ...handlers.database },
    );
  },
);
```

### Type Safety

**Required practices:**
- All function parameters and returns must be typed
- Use discriminated unions for error types
- Validate inputs at API boundaries with Valibot
- Use `satisfies` for type checking without widening

**Avoid:**
- `any` type - use `unknown` and narrow
- Type assertions (`as`) without validation
- `v.unknown()` in schemas - define specific types

## Common Tasks

### Adding a New Entity

1. **Schema**: `packages/db/src/schemas/[entity].ts`
2. **Errors**: `packages/effect/src/errors.ts` (add NotFound, etc.)
3. **Service**: `packages/[domain]/src/[entity]/`
4. **Contract**: `packages/api/src/contracts/[entity].ts`
5. **Handler**: `packages/api/src/server/router/[entity].ts`
6. **Update exports** in index files

### Adding Error Types

1. Define in `packages/effect/src/errors.ts` extending `Schema.TaggedError`
2. Add to `ApiError` union type
3. Add handler to `createErrorHandlers` in `effect-handler.ts`

### Background Jobs

1. Define payload/result types in `packages/queue/src/types.ts`
2. Add handler in `apps/server/src/workers/handlers.ts`
3. Register in worker's job type switch

## Running the Project

```bash
pnpm install           # Install dependencies
pnpm db:push           # Apply database schema
pnpm dev               # Start all apps in development
pnpm typecheck         # Run TypeScript checks
pnpm lint              # Run linting
```

## Testing

Content Studio uses a **testing pyramid**: unit tests (Vitest) → integration tests (real DB) → E2E tests (Playwright).

**Full documentation**: `docs/testing/README.md`

### Quick Commands

```bash
# Unit tests
pnpm test                    # Run all unit tests

# E2E tests (fully automated)
pnpm test:db:setup           # First time: start test DB + migrations
pnpm test:e2e                # Run E2E tests (auto-starts servers)
pnpm test:e2e:ui             # Playwright UI mode

# Test database
pnpm test:db:up              # Start test database
pnpm test:db:down            # Stop test database
```

### E2E Test Environment

E2E tests run in an **isolated environment**:
- **Test database**: PostgreSQL on port 5433 (Docker)
- **Mock AI**: LLM and TTS return fixed responses (no API calls)
- **Auto-start**: Playwright starts server + web app automatically

### Test Structure

```
packages/testing/            # Shared test utilities
  src/mocks/                 # MockLLMLive, MockTTSLive, InMemoryStorageLive
  src/factories/             # createTestUser, createTestPodcast, etc.
  src/setup/                 # TestContext with transaction rollback

apps/web/e2e/
  fixtures/                  # auth.ts (login), api.ts (data creation)
  tests/                     # *.spec.ts test files
  seed.ts                    # Creates test user via sign-up API
```

### E2E Test Patterns

**Authentication** - use `login` fixture in `beforeEach`:
```typescript
import { login } from '../fixtures';

test.beforeEach(async ({ page }) => {
  await login(page);
});
```

**API calls with auth** - use `page.request` (NOT `request` fixture):
```typescript
// ✅ Correct - shares browser cookies
const doc = await createDocument(page.request, { title: 'Test' });

// ❌ Wrong - no authentication
const doc = await createDocument(request, { title: 'Test' });
```

**Flexible selectors** - handle different UI states:
```typescript
const createButton = page
  .getByRole('button', { name: 'Create New' })
  .or(page.getByRole('button', { name: 'Create Podcast' }));
await createButton.first().click();
```

### Mock Layers

Use mocks from `@repo/testing` for external services:

```typescript
import { MockLLMLive, MockTTSLive } from '@repo/testing/mocks';

// In tests
Effect.provide(myEffect, Layer.mergeAll(MockLLMLive, MockTTSLive));
```

### Test User

Default credentials (created by `e2e:seed`):
- Email: `test@example.com`
- Password: `testpassword123`

## What NOT to Do

1. **Don't bypass the Effect system** - No direct database access outside `withDb`
2. **Don't suppress errors** - Always log with context and stack traces
3. **Don't use magic numbers** - Extract to named constants
4. **Don't duplicate error handling** - Use `createErrorHandlers` factory
5. **Don't skip type validation** - All API inputs must be validated
6. **Don't create new patterns** - Follow existing service layer structure

## Frontend Patterns

### Component Organization

- **Target size**: Keep components under 200 lines
- **Split large components** into focused sub-components in a `/components` subdirectory
- **Use barrel exports** (`index.ts`) for component directories

### Custom Hooks

Location: `apps/web/src/hooks/`

Available hooks:
- `useQueryInvalidation` - Cache invalidation by entity type
- `useSessionGuard` - Authentication state and guards
- `usePodcastGeneration` - Podcast creation and generation mutations

```typescript
import { useQueryInvalidation, useSessionGuard } from '@/hooks';

const { invalidatePodcasts, invalidateProjects } = useQueryInvalidation();
const { user, isAuthenticated, isPending } = useSessionGuard();
```

### BaseDialog Component

Use `BaseDialog` for all modal dialogs to ensure consistent styling and behavior.

Location: `apps/web/src/components/base-dialog/`

```typescript
import { BaseDialog } from '@/components/base-dialog';

<BaseDialog
  open={open}
  onOpenChange={onOpenChange}
  title="Create Project"
  description="Optional description text"
  maxWidth="lg"  // 'sm' | 'md' | 'lg' | 'xl'
  scrollable     // Enable for long content
  footer={{
    submitText: 'Create',
    loadingText: 'Creating...',
    submitDisabled: !isValid,
    onSubmit: handleSubmit,
    isLoading: mutation.isPending,
  }}
>
  {/* Form content */}
</BaseDialog>
```

### Error Boundaries

Location: `apps/web/src/components/error-boundary/`

Error boundaries are integrated at:
- Root layout (`__root.tsx`) - Catches app-wide errors
- Protected layout (`_protected/layout.tsx`) - Resets on user change

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary
  resetKeys={[userId]}  // Reset when these values change
  onError={(error) => logError(error)}
  FallbackComponent={CustomFallback}  // Optional custom UI
>
  {children}
</ErrorBoundary>
```

### Constants

Location: `apps/web/src/constants.ts`

Centralize app-wide constants (branding, status strings, etc.):

```typescript
import { APP_NAME, APP_VERSION, APP_NAME_WITH_VERSION } from '@/constants';
```

### API Client Usage

Use oRPC client with React Query for type-safe API calls:

```typescript
import { apiClient } from '@/clients/apiClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { invalidateQueries } from '@/clients/query-helpers';

// Queries
const { data, isPending } = useQuery(
  apiClient.podcasts.get.queryOptions({ input: { id } })
);

// Mutations with cache invalidation
const mutation = useMutation(
  apiClient.podcasts.create.mutationOptions({
    onSuccess: async () => {
      toast.success('Created!');
      onOpenChange(false);  // Close dialog BEFORE await
      await invalidateQueries('podcasts', 'projects');
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to create');
    },
  })
);
```

### Mutation Success Handler Order

**CRITICAL**: In `onSuccess` handlers, always close dialogs or navigate BEFORE awaiting `invalidateQueries`. This prevents memory leaks from async operations running on unmounted components.

```typescript
// ✅ CORRECT: Close/navigate before await
onSuccess: async (data) => {
  toast.success('Created!');
  onOpenChange(false);  // Close dialog first
  navigate({ to: '/new-route' });  // Or navigate first
  await invalidateQueries('entities');  // Then await
}

// ❌ WRONG: Await before close/navigate (causes memory leaks)
onSuccess: async (data) => {
  await invalidateQueries('entities');  // Component may unmount during await
  onOpenChange(false);  // Too late - component already unmounted
}
```

### Form Handling

- Use React state for form values
- Validate on submit, not on every change
- Show loading state during submission
- Display user-friendly error messages

### Accessibility

- Add `aria-label` to icon-only buttons
- Use `aria-checked` and `role="checkbox"` for custom checkboxes
- Ensure all form inputs have associated labels

### CSS & Styling

**Location**: `tools/tailwind/style.css`

All component styles MUST be centralized in the global CSS file using `@layer components`. This ensures consistency, maintainability, and prevents "AI slop" aesthetics.

**Design System: "Studio Pro"**
- **Primary**: Refined sapphire blue (HSL 225) - premium, trustworthy, cutting-edge
- **Accent**: Subtle blue-tinted grays for cohesion
- **Typography**: DM Sans (body), Source Serif 4 (editorial headings), JetBrains Mono (technical/meta)
- **Theme**: Clean whites with cool undertones (light) / deep blacks with electric sapphire glow (dark)

**Required practices:**

1. **Centralize all styles** - Define component classes in `@layer components` in `tools/tailwind/style.css`
2. **Use semantic class names** - Name classes by purpose, not appearance (e.g., `.script-panel-header` not `.flex-between-border`)
3. **Avoid inline Tailwind** - Components should use centralized classes, not long chains of utility classes

```tsx
// ✅ CORRECT: Use centralized classes
<div className="workbench-header">
  <h1 className="workbench-title">{title}</h1>
</div>

// ❌ WRONG: Inline utility classes
<div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm">
  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 truncate tracking-tight">{title}</h1>
</div>
```

**Exceptions** (inline Tailwind allowed):
- Layout utilities: `flex`, `flex-1`, `gap-2`, `w-full`, `min-w-0`
- Spacing adjustments: `mr-2`, `mt-4`, `p-4`
- Responsive modifiers: `md:flex`, `lg:grid-cols-2`
- One-off size overrides: `w-4 h-4` for icons

**Never use these patterns (AI slop):**
- Purple/violet/fuchsia gradient combinations
- Generic fonts (Inter, Roboto, Arial, system-ui alone)
- Gradient buttons with `from-X-600 to-Y-600` patterns
- Overused color schemes (purple on white backgrounds)

**Adding new component styles:**

```css
/* In tools/tailwind/style.css */
@layer components {
  .my-component {
    @apply border border-border bg-card rounded-lg p-4;
  }

  .my-component-title {
    @apply font-medium text-foreground;
  }

  .my-component:hover .my-component-title {
    @apply text-primary;
  }
}
```

**Key centralized class categories:**
- Layout: `.page-container`, `.content-grid-2`, `.workbench`
- Typography: `.page-title`, `.page-eyebrow`, `.text-body`, `.text-meta`
- Cards: `.card`, `.action-card`, `.list-item`
- Forms: `.search-input`, `.settings-option`, `.settings-textarea`
- States: `.empty-state`, `.loading-center`, `.error-display`

## Code Review Checklist

**Backend:**
- [ ] All errors handled with proper typing (no `any`)
- [ ] `handleEffect` used with error factory
- [ ] Database operations wrapped in `withDb`
- [ ] Stack traces preserved in error logging
- [ ] No silent error suppression
- [ ] Input validation at API boundary
- [ ] Serializers used for API responses

**Frontend:**
- [ ] TypeScript compiles without errors
- [ ] Frontend components under 200 lines
- [ ] Dialogs use BaseDialog component
- [ ] Error boundaries in place at layout levels
- [ ] Mutation onSuccess: close/navigate BEFORE await invalidateQueries
- [ ] Component styles centralized in `tools/tailwind/style.css`
- [ ] No inline Tailwind chains (use semantic class names)
- [ ] No AI slop patterns (purple gradients, generic fonts)

**Testing:**
- [ ] E2E tests use `page.request` for authenticated API calls
- [ ] Tests clean up created resources in `afterEach`
- [ ] No `test.only` in committed code
- [ ] Critical user flows have E2E coverage
- [ ] Mock layers used for external services (AI, storage)
