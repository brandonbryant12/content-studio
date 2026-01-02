# Frontend E2E Testing Implementation Plan

> **STATUS: NOT STARTED** - Infrastructure first, then test suites
> - Playwright configured, no tests written yet
> - Backend testing patterns established in `@repo/testing`

## Overview

Set up comprehensive Playwright E2E tests for the Content Studio frontend covering authentication, document management, and podcast creation flows.

## Prerequisites

**Docker must be running** for the test database:

```bash
# Start test database (required before running E2E tests)
docker compose -f docker-compose.test.yml up -d

# Verify database is ready
docker compose -f docker-compose.test.yml ps
```

The test database runs on `localhost:5433` with credentials `test:test`.

## Validation Commands

After each sprint, run these commands to validate:

```bash
# Run all E2E tests
pnpm --filter web test:e2e

# Run E2E tests with UI (for debugging)
pnpm --filter web test:e2e:ui

# Run specific test file
pnpm --filter web exec playwright test tests/auth/login.spec.ts

# View test report
pnpm --filter web exec playwright show-report
```

---

## Target Architecture

```
apps/web/e2e/
├── global-setup.ts              # Create test user + save auth state
├── seed.ts                      # Seed test database via API
├── fixtures/
│   └── index.ts                 # Custom fixtures (pages, api, auth)
├── pages/
│   ├── base.page.ts             # Common methods (toast, loading)
│   ├── login.page.ts            # Login form selectors
│   ├── dashboard.page.ts        # Dashboard navigation
│   ├── documents.page.ts        # Document list + upload
│   └── podcasts.page.ts         # Podcast list + workbench
├── utils/
│   └── api.ts                   # Direct API helpers for test data
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── register.spec.ts
│   │   └── protected-routes.spec.ts
│   ├── dashboard/
│   │   └── navigation.spec.ts
│   ├── documents/
│   │   ├── upload.spec.ts
│   │   └── list.spec.ts
│   └── podcasts/
│       ├── create.spec.ts
│       ├── setup-wizard.spec.ts
│       └── workbench.spec.ts
└── .auth/                       # Gitignored - cached auth state
    └── user.json
```

---

## Sprint 1: Infrastructure

**Goal**: Set up testing infrastructure and fixtures

### 1.1 Create `e2e/seed.ts`
Seed test user via better-auth API:
```typescript
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
  name: 'E2E Test User',
};
```
- Register test user via `/api/auth/sign-up/email`
- Handle case where user already exists

### 1.2 Create `e2e/global-setup.ts`
- Run seed script
- Launch browser, login as test user
- Save auth state to `.auth/user.json`
- This runs once before all tests

### 1.3 Add `.auth/` to `.gitignore`
Prevent committing cached auth state

### 1.4 Create `e2e/pages/base.page.ts`
Common methods:
- `getToast()` - Sonner toast selector
- `expectSuccessToast(message)`
- `expectErrorToast(message)`
- `waitForSpinner()`

### 1.5 Create `e2e/fixtures/index.ts`
Extend Playwright's base test with:
- Page object fixtures
- `authenticatedTest` with stored auth state
- API helper fixture

### 1.6 Create `e2e/utils/api.ts`
Direct API helpers for test data:
- `createDocument(title, content)`
- `createPodcast(title)`
- `deleteDocument(id)`
- `deletePodcast(id)`

**Validation**: `pnpm --filter web exec playwright test --list` (should find no tests yet)

---

## Sprint 2: Page Objects

**Goal**: Create page objects for maintainability

### 2.1 Create `e2e/pages/login.page.ts`
Selectors (from actual code):
```typescript
readonly emailInput = this.page.getByLabel('Email');
readonly passwordInput = this.page.getByLabel('Password');
readonly signInButton = this.page.getByRole('button', { name: 'Sign in' });
```
Methods:
- `goto()`
- `login(email, password)`
- `expectValidationError(message)`
- `expectRedirectToDashboard()`

### 2.2 Create `e2e/pages/dashboard.page.ts`
- Sidebar navigation links
- Quick action buttons
- Recent items sections

### 2.3 Create `e2e/pages/documents.page.ts`
- Upload button/dialog
- Document list
- Search input

### 2.4 Create `e2e/pages/podcasts.page.ts`
- Create new button
- Podcast list
- Setup wizard navigation
- Workbench components

**Validation**: TypeScript compiles page objects

---

## Sprint 3: Auth Tests

**Goal**: Test authentication flows

### 3.1 Create `tests/auth/login.spec.ts`
- [ ] Successful login redirects to dashboard
- [ ] Shows validation error for invalid email
- [ ] Shows validation error for short password
- [ ] Shows error toast for incorrect credentials
- [ ] Password visibility toggle works

### 3.2 Create `tests/auth/register.spec.ts`
- [ ] Successful registration creates account
- [ ] Shows error when passwords don't match
- [ ] Shows error for existing email

### 3.3 Create `tests/auth/protected-routes.spec.ts`
- [ ] Unauthenticated user redirected from /dashboard
- [ ] Unauthenticated user redirected from /podcasts
- [ ] Unauthenticated user redirected from /documents
- [ ] Unauthenticated user can access /login
- [ ] Unauthenticated user can access /register

**Validation**: `pnpm --filter web exec playwright test tests/auth/`

---

## Sprint 4: Dashboard Tests

**Goal**: Test dashboard navigation and quick actions

### 4.1 Create `tests/dashboard/navigation.spec.ts`
- [ ] Sidebar navigation to documents works
- [ ] Sidebar navigation to podcasts works
- [ ] Active route highlighted in sidebar
- [ ] "View all" links navigate correctly

**Validation**: `pnpm --filter web exec playwright test tests/dashboard/`

---

## Sprint 5: Document Tests

**Goal**: Test document upload and management

### 5.1 Create `tests/documents/upload.spec.ts`
- [ ] Upload text file via file picker
- [ ] Rejects unsupported file types
- [ ] Rejects files over 10MB
- [ ] Auto-fills title from filename

### 5.2 Create `tests/documents/list.spec.ts`
- [ ] Displays uploaded documents
- [ ] Search filters documents
- [ ] Shows empty state for no results
- [ ] Delete document removes from list

**Validation**: `pnpm --filter web exec playwright test tests/documents/`

---

## Sprint 6: Podcast Tests

**Goal**: Test podcast creation and editing

### 6.1 Create `tests/podcasts/create.spec.ts`
- [ ] Create new podcast navigates to workbench
- [ ] Shows loading state during creation

### 6.2 Create `tests/podcasts/setup-wizard.spec.ts`
- [ ] Complete wizard flow end-to-end
- [ ] Cannot proceed without selecting documents
- [ ] Can navigate back through steps

### 6.3 Create `tests/podcasts/workbench.spec.ts`
- [ ] Displays podcast title
- [ ] Script panel shows segments
- [ ] Edit segment text works
- [ ] Cmd+S saves changes
- [ ] Warns before leaving with unsaved changes

**Validation**: `pnpm --filter web exec playwright test tests/podcasts/`

---

## Key Files to Modify

| File | Action |
|------|--------|
| `apps/web/e2e/global-setup.ts` | Create (seed + auth state) |
| `apps/web/e2e/seed.ts` | Create (test user registration) |
| `apps/web/e2e/fixtures/index.ts` | Create (custom fixtures) |
| `apps/web/e2e/pages/*.ts` | Create (page objects) |
| `apps/web/e2e/tests/**/*.spec.ts` | Create (test files) |
| `apps/web/.gitignore` | Add `.auth/` |

---

## Key Files to Reference

| File | Purpose |
|------|---------|
| `apps/web/playwright.config.ts` | Existing Playwright config |
| `apps/web/src/routes/_public/-components/login-form.tsx` | Login form selectors |
| `apps/web/src/routes/_protected/podcasts/-components/setup/` | Wizard components |
| `packages/auth/src/client/index.ts` | Auth API endpoints |
| `docker-compose.test.yml` | Test database config |

---

## Success Criteria

- [ ] **Sprint 1**: Infrastructure ready, fixtures created
- [ ] **Sprint 2**: All page objects complete
- [ ] **Sprint 3**: Auth tests passing
- [ ] **Sprint 4**: Dashboard tests passing
- [ ] **Sprint 5**: Document tests passing
- [ ] **Sprint 6**: Podcast tests passing

Each sprint maintains a working test suite that passes in CI.

---

## CI Integration Notes

The existing `playwright.config.ts` is already configured for CI:
- `workers: 1` on CI for isolation
- `retries: 2` on CI for flakiness
- `forbidOnly: true` on CI to catch `.only` usage
- Web servers configured to start API and Web app

Add to CI pipeline:
```yaml
- name: Start test database
  run: docker compose -f docker-compose.test.yml up -d

- name: Wait for database
  run: docker compose -f docker-compose.test.yml exec -T db-test pg_isready -U test

- name: Run E2E tests
  run: pnpm --filter web test:e2e
```
