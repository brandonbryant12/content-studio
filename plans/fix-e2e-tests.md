# E2E Test Validation and Fixes Implementation Plan

> **STATUS: NOT STARTED**

## Overview

Run and validate all E2E tests by feature area, fixing any failures encountered. The goal is to ensure all 55 E2E tests across 9 spec files pass consistently. Each sprint focuses on one feature area (auth, dashboard, documents, podcasts).

## Key Decisions

| Decision | Choice |
|----------|--------|
| Test grouping | By feature area (4 sprints) |
| Fix scope | Run tests AND fix any failures |
| Test runner | Playwright via `pnpm test:e2e` |

## Validation Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific feature tests
pnpm test:e2e -- e2e/tests/auth/
pnpm test:e2e -- e2e/tests/dashboard/
pnpm test:e2e -- e2e/tests/documents/
pnpm test:e2e -- e2e/tests/podcasts/

# Run with UI for debugging
pnpm test:e2e:ui

# Full validation
pnpm test:e2e
```

---

## Target Architecture

```
apps/web/e2e/
├── tests/
│   ├── auth/                    # Sprint 1: 21 tests
│   │   ├── login.spec.ts        # 6 tests
│   │   ├── register.spec.ts     # 8 tests
│   │   └── protected-routes.spec.ts  # 7 tests
│   ├── dashboard/               # Sprint 2: 7 tests
│   │   └── navigation.spec.ts   # 7 tests
│   ├── documents/               # Sprint 3: 8 tests
│   │   ├── list.spec.ts         # 5 tests
│   │   └── upload.spec.ts       # 3 tests
│   └── podcasts/                # Sprint 4: 19 tests
│       ├── create.spec.ts       # 6 tests
│       ├── setup-wizard.spec.ts # 5 tests
│       └── workbench.spec.ts    # 8 tests
├── pages/                       # Page objects (may need fixes)
├── fixtures/                    # Test fixtures
└── global-setup.ts              # Auth setup
```

---

## Step 0: Familiarize with Test Infrastructure

**Goal**: Understand the E2E test setup before running tests

### Read Test Configuration
- [ ] `apps/web/playwright.config.ts` - Playwright configuration
- [ ] `apps/web/e2e/global-setup.ts` - Global auth setup
- [ ] `apps/web/e2e/fixtures/index.ts` - Test fixtures

### Review Page Objects
- [ ] `apps/web/e2e/pages/base.page.ts` - Base page object
- [ ] `apps/web/e2e/pages/login.page.ts` - Login page
- [ ] `apps/web/e2e/pages/dashboard.page.ts` - Dashboard page

**No code changes** - understanding only.

---

## Sprint 1: Auth Tests

**Goal**: Validate and fix all authentication-related tests (21 tests)

### 1.1 Run login.spec.ts tests
Run the 6 login tests and fix any failures:
- Form display validation
- Email validation errors
- Password validation errors
- Invalid credentials handling
- Successful login flow
- Navigation to registration

### 1.2 Run register.spec.ts tests
Run the 8 registration tests and fix any failures:
- Form display validation
- Name/email/password validation
- Password mismatch detection
- Existing email handling
- Successful registration
- Navigation to login

### 1.3 Run protected-routes.spec.ts tests
Run the 7 protected route tests and fix any failures:
- Unauthenticated redirects (4 tests)
- Authenticated access (3 tests)

**Validation**: `pnpm test:e2e -- e2e/tests/auth/`

---

## Sprint 2: Dashboard Tests

**Goal**: Validate and fix all dashboard navigation tests (7 tests)

### 2.1 Run navigation.spec.ts tests
Run the 7 dashboard tests and fix any failures:
- Dashboard display validation
- Sidebar navigation (Documents, Podcasts)
- "View all" link navigation
- Quick action dialogs (upload document, new podcast)

**Validation**: `pnpm test:e2e -- e2e/tests/dashboard/`

---

## Sprint 3: Documents Tests

**Goal**: Validate and fix all document-related tests (8 tests)

### 3.1 Run list.spec.ts tests
Run the 5 list tests and fix any failures:
- Page display validation
- Empty state handling
- Upload dialog interaction
- Search functionality

### 3.2 Run upload.spec.ts tests
Run the 3 upload tests and fix any failures:
- Dialog open/close
- File input presence
- File upload (may be skipped)

**Validation**: `pnpm test:e2e -- e2e/tests/documents/`

---

## Sprint 4: Podcasts Tests

**Goal**: Validate and fix all podcast-related tests (19 tests)

### 4.1 Run create.spec.ts tests
Run the 6 create/list tests and fix any failures:
- Page display validation
- Empty state handling
- Podcast creation flows
- Search functionality

### 4.2 Run setup-wizard.spec.ts tests
Run the 5 setup wizard tests and fix any failures:
- Wizard display validation
- Step progression (basics, documents, audio)
- Back navigation

### 4.3 Run workbench.spec.ts tests
Run the 8 workbench tests and fix any failures:
- Podcast list display
- Detail navigation
- Script editor (may be skipped)
- Keyboard shortcuts (may be skipped)

**Validation**: `pnpm test:e2e -- e2e/tests/podcasts/`

---

## Key Files to Modify

| File | Action |
|------|--------|
| `apps/web/e2e/tests/auth/*.spec.ts` | Fix any failing auth tests |
| `apps/web/e2e/tests/dashboard/*.spec.ts` | Fix any failing dashboard tests |
| `apps/web/e2e/tests/documents/*.spec.ts` | Fix any failing document tests |
| `apps/web/e2e/tests/podcasts/*.spec.ts` | Fix any failing podcast tests |
| `apps/web/e2e/pages/*.page.ts` | Update page objects if selectors changed |
| `apps/web/src/**/*.tsx` | Fix app code if tests reveal real bugs |

---

## Success Criteria

- [ ] **Sprint 1**: All 21 auth tests passing
- [ ] **Sprint 2**: All 7 dashboard tests passing
- [ ] **Sprint 3**: All 8 document tests passing
- [ ] **Sprint 4**: All 19 podcast tests passing

Each sprint maintains working tests with all previous tests still passing.

---

## Standards Reference

- `/standards/implementation-plan.md` - Implementation plan format
- `apps/web/e2e/README.md` - E2E test documentation (if exists)
