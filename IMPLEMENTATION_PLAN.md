# Frontend Refactoring Implementation Plan

> **STATUS: IN PROGRESS** - Sprint 4 complete, Sprint 5 next
> - Backend refactoring complete (previous plan archived)
> - Frontend refactoring to match backend standards

## Overview

Refactor the Content Studio frontend to follow documented standards with feature-based organization, Container/Presenter pattern, Suspense-first data fetching, and optimistic mutation factory.

## Validation Commands

After each change, run these commands to validate:

```bash
# Type check and build
pnpm --filter web typecheck
pnpm --filter web build

# Run tests
pnpm --filter web test

# Full validation
pnpm typecheck && pnpm test && pnpm build
```

---

## Target Architecture

```
apps/web/src/
├── features/
│   ├── podcasts/
│   │   ├── components/
│   │   │   ├── podcast-detail-container.tsx    # Container
│   │   │   ├── podcast-detail.tsx              # Presenter
│   │   │   ├── podcast-list-container.tsx
│   │   │   ├── podcast-list.tsx
│   │   │   └── workbench/                      # Sub-components
│   │   ├── hooks/
│   │   │   ├── use-podcast.ts                  # useSuspenseQuery
│   │   │   ├── use-podcast-list.ts
│   │   │   ├── use-optimistic-generation.ts    # Uses factory
│   │   │   └── use-script-editor.ts            # Local state
│   │   └── lib/status.ts
│   └── documents/
│       ├── components/
│       └── hooks/
├── shared/
│   ├── components/
│   │   ├── suspense-boundary.tsx               # New
│   │   └── error-boundary/                     # Moved
│   ├── hooks/
│   │   ├── use-optimistic-mutation.ts          # Factory hook
│   │   └── use-navigation-block.ts             # Extracted
│   └── lib/
│       └── errors.ts                           # Moved
└── routes/                                     # Thin route files
    └── _protected/podcasts/$podcastId.tsx      # < 30 lines
```

---

## Step 0: Familiarize with Standards

**Goal**: Read and understand all frontend standards before implementation

### Read Core Standards
- [ ] `/standards/frontend/components.md` - Container/Presenter pattern
- [ ] `/standards/frontend/data-fetching.md` - TanStack Query with useSuspenseQuery
- [ ] `/standards/frontend/mutations.md` - Optimistic mutation factory pattern
- [ ] `/standards/frontend/error-handling.md` - Error formatting with isDefinedError

### Read Supporting Standards
- [ ] `/standards/frontend/forms.md` - TanStack Form patterns
- [ ] `/standards/frontend/real-time.md` - SSE and query invalidation
- [ ] `/standards/frontend/styling.md` - Design system patterns
- [ ] `/standards/frontend/testing.md` - Integration testing with MSW

### Review Current Implementation
- [ ] `apps/web/src/routes/_protected/podcasts/$podcastId.tsx` - Main file to refactor
- [ ] `apps/web/src/hooks/` - Current hook patterns
- [ ] `apps/web/src/lib/errors.ts` - Existing error handling (already follows standards)

**No code changes in this sprint** - understanding only.

---

## Sprint 1: Foundation ✅ COMPLETE

**Goal**: Create shared infrastructure

### 1.1 Create `shared/hooks/use-optimistic-mutation.ts` ✅
Factory hook that all feature mutations will use:
- `queryKey`, `mutationFn`, `getOptimisticData`
- Auto rollback on error
- Toast integration
- `showSuccessToast` option

### 1.2 Create `shared/components/suspense-boundary.tsx` ✅
Combines ErrorBoundary + Suspense with default spinner fallback

### 1.3 Create `shared/hooks/use-navigation-block.ts` ✅
Extract from `$podcastId.tsx`:
- TanStack Router `useBlocker`
- Browser `beforeunload` handling

### 1.4 Create `shared/hooks/use-keyboard-shortcut.ts` ✅
Generic keyboard shortcut hook

### 1.5 Move shared code to `/shared/` ✅
| From | To |
|------|-----|
| `src/components/error-boundary/` | `src/shared/components/error-boundary/` |
| `src/components/confirmation-dialog/` | `src/shared/components/confirmation-dialog/` |
| `src/components/base-dialog/` | `src/shared/components/base-dialog/` |
| `src/lib/errors.ts` | `src/shared/lib/errors.ts` |
| `src/lib/formatters.ts` | `src/shared/lib/formatters.ts` |

### 1.6 Create `shared/index.ts` barrel export ✅

**Validation**: `pnpm --filter web typecheck` ✅ PASSED

---

## Sprint 2: Podcasts Feature - Hooks ✅ COMPLETE

**Goal**: Create feature-based hooks

### 2.1 Create `features/podcasts/hooks/use-podcast.ts` ✅
- `usePodcast(podcastId)` with useSuspenseQuery
- `getPodcastQueryKey(podcastId)` helper for cache operations

### 2.2 Create `features/podcasts/hooks/use-podcast-list.ts` ✅
- `usePodcastList()` with useQuery (conditional fetching)
- `useSuspensePodcastList()` with useSuspenseQuery
- `getPodcastListQueryKey()` helper

### 2.3 Create mutation hooks using factory ✅
- `use-optimistic-generation.ts` - Full generation with factory
- `use-optimistic-save-changes.ts` - Save changes with factory
- `use-optimistic-delete.ts` - Delete with factory and navigation

### 2.4 Move existing hooks ✅
| From | To |
|------|-----|
| `src/hooks/use-script-editor.ts` | `features/podcasts/hooks/use-script-editor.ts` |
| `src/hooks/use-podcast-settings.ts` | `features/podcasts/hooks/use-podcast-settings.ts` |
| `src/hooks/use-document-selection.ts` | `features/podcasts/hooks/use-document-selection.ts` |
| `src/hooks/use-podcast-generation.ts` | `features/podcasts/hooks/use-podcast-generation.ts` |

### 2.5 Create `features/podcasts/hooks/index.ts` barrel ✅
- Feature barrel: `features/podcasts/index.ts`
- Root features barrel: `features/index.ts`
- Backward compatibility: `src/hooks/index.ts` re-exports from features

### 2.6 Update shared factory hook ✅
- `useOptimisticMutation` now uses `MutationFunction` type for TanStack Query compatibility

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build` ✅ PASSED

---

## Sprint 3: Podcasts - Container/Presenter Split ✅ COMPLETE

**Goal**: Split `$podcastId.tsx` (263 lines) into Container + Presenter

### 3.1 Create `features/podcasts/components/podcast-detail-container.tsx` ✅
**Container responsibilities**:
- `usePodcast(podcastId)` with Suspense
- Coordinate hooks: `useScriptEditor`, `usePodcastSettings`, `useDocumentSelection`
- Mutation handlers: `handleSave`, `handleGenerate`, `handleDelete`
- `useKeyboardShortcut` for Cmd+S
- `useNavigationBlock` for unsaved changes
- Show `SetupWizardContainer` if `isSetupMode(podcast)`

### 3.2 Create `features/podcasts/components/podcast-detail.tsx` ✅
**Presenter responsibilities** (pure UI):
```typescript
interface PodcastDetailProps {
  podcast: Podcast;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
  hasChanges: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: () => void;
  onGenerate: () => void;
  onDelete: () => void;
}
```

### 3.3 Update route file to be thin ✅
```typescript
// routes/_protected/podcasts/$podcastId.tsx (27 lines)
function PodcastPage() {
  const { podcastId } = Route.useParams();
  return (
    <SuspenseBoundary resetKeys={[podcastId]}>
      <PodcastDetailContainer podcastId={podcastId} />
    </SuspenseBoundary>
  );
}
```

### 3.4 Move workbench components ✅
Moved `routes/_protected/podcasts/-components/workbench/` → `features/podcasts/components/workbench/`

Also moved:
- Setup wizard components to `features/podcasts/components/setup/`
- Audio player and podcast icon to `features/podcasts/components/`

### 3.5 Create `features/podcasts/lib/status.ts` ✅
- `isGeneratingStatus(status)`
- `isSetupMode(podcast)`
- `getStatusConfig(status)`
- `isActionDisabled(status)`
- `isReadyStatus(status)`

**Validation**: `pnpm typecheck && pnpm build` ✅ PASSED

---

## Sprint 4: Podcast List Page ✅ COMPLETE

**Goal**: Apply Container/Presenter to list page

### 4.1 Create `PodcastListContainer` ✅
- `usePodcastList()` for data
- Search state management
- Create/delete mutation handlers using new hooks

### 4.2 Create `PodcastList` presenter ✅
Pure UI with props:
```typescript
interface PodcastListProps {
  podcasts: readonly PodcastListItem[];
  searchQuery: string;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}
```

### 4.3 Update `routes/_protected/podcasts/index.tsx` ✅
Route file reduced from 185 lines to 10 lines.

### 4.4 Create mutation hooks ✅
- `use-optimistic-create.ts` - Create with navigation
- `use-optimistic-delete-list.ts` - Delete with optimistic removal

### 4.5 Move `PodcastItem` to features ✅
Moved to `features/podcasts/components/podcast-item.tsx`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build` ✅ PASSED

---

## Sprint 5: Documents Feature

**Goal**: Apply same patterns to documents

### 5.1 Create `features/documents/hooks/`
- `use-documents.ts` (query + suspense variants)
- `use-optimistic-delete.ts` (using factory)

### 5.2 Create Container/Presenter
- `DocumentListContainer`
- `DocumentList`

### 5.3 Update `routes/_protected/documents/index.tsx`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 6: Dashboard and Cleanup

**Goal**: Update dashboard, remove old code

### 6.1 Create `DashboardContainer`
Uses hooks from both features

### 6.2 Remove old directories
After verification:
- Delete `src/hooks/` (moved to features)
- Delete `src/db/` (replaced by feature hooks)
- Delete `src/components/` (moved to shared)
- Delete route `-components/` directories

### 6.3 Update all import paths

**Final Validation**: `pnpm typecheck && pnpm test && pnpm build`

---

## Key Files to Modify

| File | Action |
|------|--------|
| `apps/web/src/routes/_protected/podcasts/$podcastId.tsx` | Replace 263-line god component with thin route |
| `apps/web/src/hooks/use-optimistic-podcast-mutation.ts` | Refactor to use factory |
| `apps/web/src/hooks/use-script-editor.ts` | Move to features |
| `apps/web/src/hooks/use-podcast-settings.ts` | Move to features |
| `apps/web/src/db/hooks.ts` | Replace with feature hooks |

---

## Success Criteria

**Part 1: Frontend Refactoring**
- [x] **Sprint 1**: Factory hook + SuspenseBoundary + shared structure
- [x] **Sprint 2**: All podcast hooks in `features/podcasts/hooks/`
- [x] **Sprint 3**: `$podcastId.tsx` < 30 lines, Container/Presenter split
- [x] **Sprint 4**: Podcast list page refactored
- [ ] **Sprint 5**: Documents feature follows same patterns
- [ ] **Sprint 6**: Old code removed, all imports updated

**Part 2: Frontend Testing**
- [ ] **Sprint 7**: Component test infrastructure ready
- [ ] **Sprint 8**: Component tests passing (shared + features)
- [ ] **Sprint 9**: E2E infrastructure ready
- [ ] **Sprint 10**: E2E tests passing
- [ ] **Sprint 11**: Testing standards updated

Each sprint maintains working functionality with passing build.

---

## Standards Reference

- `/standards/frontend/components.md` - Container/Presenter pattern
- `/standards/frontend/data-fetching.md` - useSuspenseQuery patterns
- `/standards/frontend/mutations.md` - Optimistic mutation factory
- `/standards/frontend/error-handling.md` - Error formatting

---

# Part 2: Frontend Testing

> **Prerequisites**: Docker required for E2E tests only
> `docker compose -f docker-compose.test.yml up -d`
>
> Test database runs on `localhost:5433` with credentials `test:test`.

## Testing Validation Commands

```bash
# Component tests (fast, no Docker needed)
pnpm --filter web test              # Run once
pnpm --filter web test --watch      # Watch mode

# E2E tests (requires Docker + servers)
pnpm --filter web test:e2e          # Run all
pnpm --filter web test:e2e:ui       # Debug UI

# Full validation
pnpm --filter web typecheck && pnpm --filter web test && pnpm --filter web test:e2e
```

---

## Testing Target Architecture

```
apps/web/
├── src/
│   ├── test-utils/                   # Component test utilities
│   │   ├── index.tsx                 # Render with providers
│   │   ├── server.ts                 # MSW server setup
│   │   ├── setup.ts                  # Vitest setup file
│   │   └── handlers.ts               # Base MSW handlers
│   ├── features/
│   │   └── {domain}/
│   │       └── __tests__/            # Component tests per feature
│   │           ├── *.test.tsx
│   │           └── handlers.ts       # Feature-specific MSW handlers
│   └── shared/
│       └── __tests__/                # Shared component tests
│
├── e2e/                              # E2E tests
│   ├── global-setup.ts
│   ├── seed.ts
│   ├── fixtures/
│   │   └── index.ts
│   ├── pages/
│   │   ├── base.page.ts
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   ├── documents.page.ts
│   │   └── podcasts.page.ts
│   ├── utils/
│   │   └── api.ts
│   ├── tests/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   └── podcasts/
│   └── .auth/                        # Gitignored
│
└── vitest.config.ts                  # Updated with setup file
```

---

## Sprint 7: Component Test Infrastructure

**Goal**: Set up Vitest + React Testing Library + MSW

### 7.1 Install dependencies
```bash
pnpm --filter web add -D @testing-library/react @testing-library/user-event msw jsdom
```

### 7.2 Update `vitest.config.ts`
- Add `environment: 'jsdom'`
- Add `setupFiles: ['./src/test-utils/setup.ts']`

### 7.3 Create `src/test-utils/index.tsx`
Custom render with providers:
- QueryClientProvider (with retry: false)
- Router context (mock)
- Theme provider if needed

### 7.4 Create `src/test-utils/server.ts`
MSW server setup:
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

### 7.5 Create `src/test-utils/setup.ts`
Vitest setup file:
```typescript
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 7.6 Create `src/test-utils/handlers.ts`
Base MSW handlers for common endpoints:
- Auth endpoints
- Podcast list/detail
- Document list/detail

**Validation**: `pnpm --filter web test` runs without errors

---

## Sprint 8: Component Tests

**Goal**: Test shared and feature components

### 8.1 Shared Component Tests
Create `src/shared/__tests__/`:
- [ ] `error-boundary.test.tsx` - Renders children, shows fallback, reset works
- [ ] `suspense-boundary.test.tsx` - Loading spinner, content after load
- [ ] `confirmation-dialog.test.tsx` - Open/close, confirm/cancel callbacks

### 8.2 Shared Hook Tests
Create `src/shared/hooks/__tests__/`:
- [ ] `use-optimistic-mutation.test.ts` - Optimistic update, rollback, toasts

### 8.3 Podcast Feature Tests
Create `src/features/podcasts/__tests__/`:
- [ ] `handlers.ts` - MSW handlers for podcast endpoints
- [ ] `podcast-list.test.tsx` - List, empty state, error state
- [ ] `use-podcast-settings.test.ts` - Change tracking, reset
- [ ] `use-script-editor.test.ts` - Segment editing, hasChanges

### 8.4 Document Feature Tests
Create `src/features/documents/__tests__/`:
- [ ] `handlers.ts` - MSW handlers for document endpoints
- [ ] `document-list.test.tsx` - List, search, empty state
- [ ] `upload-dialog.test.tsx` - File selection, validation

**Validation**: `pnpm --filter web test`

---

## Sprint 9: E2E Infrastructure

**Goal**: Set up Playwright infrastructure

### 9.1 Create `e2e/seed.ts`
Seed test user via better-auth API:
```typescript
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
  name: 'E2E Test User',
};
```

### 9.2 Create `e2e/global-setup.ts`
- Run seed script
- Login as test user
- Save auth state to `.auth/user.json`

### 9.3 Add `.auth/` to `.gitignore`

### 9.4 Create `e2e/pages/base.page.ts`
Common methods:
- `getToast()` - Sonner toast selector
- `expectSuccessToast(message)`
- `expectErrorToast(message)`

### 9.5 Create `e2e/fixtures/index.ts`
- Page object fixtures
- `authenticatedTest` with stored auth state
- API helper fixture

### 9.6 Create `e2e/utils/api.ts`
Direct API helpers for test data

### 9.7 Create Page Objects
- `e2e/pages/login.page.ts`
- `e2e/pages/dashboard.page.ts`
- `e2e/pages/documents.page.ts`
- `e2e/pages/podcasts.page.ts`

**Validation**: `pnpm --filter web exec playwright test --list`

---

## Sprint 10: E2E Tests

**Goal**: Test complete user flows

### 10.1 Auth Tests
Create `e2e/tests/auth/`:
- [ ] `login.spec.ts` - Successful login, validation errors, bad credentials
- [ ] `register.spec.ts` - Registration, password mismatch, existing email
- [ ] `protected-routes.spec.ts` - Unauthenticated redirects

### 10.2 Dashboard Tests
Create `e2e/tests/dashboard/`:
- [ ] `navigation.spec.ts` - Sidebar navigation, quick actions

### 10.3 Document Tests
Create `e2e/tests/documents/`:
- [ ] `upload.spec.ts` - File upload, validation
- [ ] `list.spec.ts` - List, search, delete

### 10.4 Podcast Tests
Create `e2e/tests/podcasts/`:
- [ ] `create.spec.ts` - Create new podcast
- [ ] `setup-wizard.spec.ts` - Complete wizard flow
- [ ] `workbench.spec.ts` - Editing, Cmd+S save

**Validation**: `pnpm --filter web test:e2e`

---

## Sprint 11: Update Testing Standards

**Goal**: Update `standards/frontend/testing.md`

### 11.1 Add E2E Testing Section
Add to `standards/frontend/testing.md`:
- Playwright setup and patterns
- Page Object Model
- Fixtures and auth state
- When to use E2E vs component tests

### 11.2 Update Testing Comparison Table
| Type | Tools | Speed | Use Case |
|------|-------|-------|----------|
| Component | Vitest + RTL + MSW | Fast | Isolated logic |
| E2E | Playwright | Slow | Full user flows |

---

## Testing Key Files

| File | Action |
|------|--------|
| `apps/web/vitest.config.ts` | Add jsdom, setup file |
| `apps/web/package.json` | Add test dependencies |
| `apps/web/src/test-utils/` | Create (component test infra) |
| `apps/web/e2e/` | Create (E2E test infra) |
| `apps/web/.gitignore` | Add `.auth/` |
| `standards/frontend/testing.md` | Add E2E section |

---

## CI Integration

```yaml
# Component tests (fast, run first)
- name: Run component tests
  run: pnpm --filter web test

# E2E tests (slow, run after component tests pass)
- name: Start test database
  run: docker compose -f docker-compose.test.yml up -d

- name: Wait for database
  run: docker compose -f docker-compose.test.yml exec -T db-test pg_isready -U test

- name: Run E2E tests
  run: pnpm --filter web test:e2e
```
