# Brands Feature Implementation Plan

> **STATUS: IN_PROGRESS**

## Overview

Build an interactive brand-building feature where users create brands through an AI chat conversation. Brands contain personas (with TTS voice mappings) and segments (target audiences). Brands integrate with podcast creation via optional dropdowns that auto-populate voice and instruction settings.

## Validation Commands

```bash
# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter @repo/media typecheck
pnpm --filter @repo/api typecheck
pnpm --filter web typecheck

# Full validation
pnpm typecheck && pnpm build && pnpm test
```

## Dev Server Logs

The dev server is running in the background with logs written to `dev.log` in the project root.

```bash
# View recent logs
tail -100 dev.log

# Follow logs in real-time
tail -f dev.log

# Search for errors
grep -i error dev.log | tail -20
```

**Endpoints:**
- Web (Vite): http://localhost:8085/
- API Server: http://localhost:3035

## Issues

| Issue | Status | Notes |
|-------|--------|-------|
| _No issues_ | | |

---

## Tasks

### Task 01: Database Schema
**Status:** ✅ COMPLETE
**Standards:** `standards/patterns/repository.md`, `standards/patterns/serialization.md`
**Acceptance Criteria:**
- [x] BrandId type created with `brd_` prefix pattern
- [x] Brand table with name, description, mission, values, colors fields
- [x] brandGuide text field for markdown content
- [x] chatMessages JSONB array for last 30 messages
- [x] personas JSONB array with voiceId mapping to TTS
- [x] segments JSONB array with marketing-focused fields
- [x] Effect schemas for all types
- [x] Serializers following podcasts.ts pattern
**Verification:**
```bash
pnpm --filter @repo/db typecheck
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres" pnpm --filter @repo/db db:push
psql postgres://postgres:postgres@localhost:5432/postgres -c "\d brand"
```
**Details:** [01-database-schema.md](./tasks/01-database-schema.md)

---

### Task 02: Brand Repository & Use Cases
**Status:** ✅ COMPLETE
**Standards:** `standards/patterns/use-case.md`, `standards/patterns/error-handling.md`, `standards/testing/use-case-tests.md`
**Acceptance Criteria:**
- [x] BrandRepo with findById, list, insert, update, delete methods
- [x] BrandNotFound, NotBrandOwner error types
- [x] create-brand use case with ownership
- [x] get-brand use case with ownership check
- [x] update-brand use case
- [x] delete-brand use case
- [x] append-chat-message use case (manages last N)
- [ ] **Unit tests** - deferred to integration tests in Task 03
**Verification:**
```bash
pnpm --filter @repo/media test
```
**Details:** [02-repository-use-cases.md](./tasks/02-repository-use-cases.md)

---

### Task 03: API Contracts & Routes
**Status:** ✅ COMPLETE
**Standards:** `standards/patterns/router-handler.md`, `standards/testing/integration-tests.md`
**Acceptance Criteria:**
- [x] brands.list contract and route
- [x] brands.get contract and route
- [x] brands.create contract and route
- [x] brands.update contract and route
- [x] brands.delete contract and route
- [x] Proper error mapping to HTTP status codes
- [ ] **Integration tests** - deferred to Task 99
**Verification:**
```bash
pnpm test:db:up && pnpm --filter @repo/api test
```
**Details:** [03-api-routes.md](./tasks/03-api-routes.md)

---

### Task 04: Streaming Chat Endpoint
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/router-handler.md`, `standards/testing/integration-tests.md`
**Acceptance Criteria:**
- [ ] POST /api/brand-chat endpoint
- [ ] Uses Vercel AI SDK streamText with Gemini
- [ ] updateBrand tool for real-time document updates
- [ ] Emits SSE events on brand updates
- [ ] Appends messages to brand chatMessages (last 30)
- [ ] System prompt guides brand-building conversation
- [ ] **Integration tests** in `packages/api/src/server/router/__tests__/brand-chat.integration.test.ts`:
  - [ ] Successful chat request returns stream
  - [ ] UNAUTHORIZED when user is null
  - [ ] BRAND_NOT_FOUND for invalid brand
  - [ ] NOT_BRAND_OWNER when accessing other user's brand
  - [ ] Tool call updates brand and emits SSE event (use MockLLMLive)
**Verification:**
```bash
pnpm test:db:up && pnpm --filter @repo/api test
```
**Details:** [04-streaming-chat.md](./tasks/04-streaming-chat.md)

---

### Task 05: Frontend Feature Module
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`, `standards/frontend/data-fetching.md`, `standards/frontend/testing.md`
**Skill:** Use `/frontend-design` skill for all frontend components
**Acceptance Criteria:**
- [ ] /brands route with brand list
- [ ] /brands/:id route with detail view
- [ ] /brands/new route with builder
- [ ] Container/Presenter split for all views
- [ ] useBrand, useBrandList hooks
- [ ] useBrandChat hook using useChat from ai/react
- [ ] Split view: chat panel + document preview
- [ ] Skip button for skipping questions
- [ ] streamdown for markdown rendering
- [ ] **Component tests** in `apps/web/src/features/brands/__tests__/`:
  - [ ] `brand-list.test.tsx`: loading, list renders, empty state, error state
  - [ ] `brand-detail.test.tsx`: displays data, loading, not found error
  - [ ] `brand-builder.test.tsx`: chat input, message send, skip button
  - [ ] MSW handlers in `handlers.ts` for brand API mocking
**Verification:**
```bash
pnpm --filter web typecheck && pnpm --filter web build && pnpm --filter web test
```
Use `/agent-browser` on localhost:8085 (login: b@b.com / 12345678):
- Navigate to /brands - verify list renders
- Navigate to /brands/new - verify builder displays
- Send message and verify streaming works
**Details:** [05-frontend-module.md](./tasks/05-frontend-module.md)

---

### Task 06: Persona & Segment Selectors
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`, `standards/frontend/forms.md`, `standards/frontend/testing.md`
**Skill:** Use `/frontend-design` skill for polished selector components
**Acceptance Criteria:**
- [ ] BrandSelector dropdown component
- [ ] PersonaSelector card gallery (like voice-selector.tsx)
- [ ] SegmentSelector dropdown with descriptions
- [ ] Persona selection auto-sets voiceId
- [ ] Segment selection provides messaging tone
- [ ] **Component tests** in `apps/web/src/features/brands/__tests__/`:
  - [ ] `brand-selector.test.tsx`: renders options, calls onChange, empty state
  - [ ] `persona-selector.test.tsx`: renders cards, selection updates voiceId
  - [ ] `segment-selector.test.tsx`: renders options with descriptions, selection fires callback
**Verification:**
```bash
pnpm --filter web test
```
**Details:** [06-selectors.md](./tasks/06-selectors.md)

---

### Task 07: Podcast Form Integration
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/forms.md`, `standards/frontend/testing.md`
**Acceptance Criteria:**
- [ ] Optional brand dropdown in podcast setup
- [ ] Persona dropdown appears when brand selected
- [ ] Selecting persona auto-fills hostVoice
- [ ] Segment dropdown for target audience
- [ ] Selecting segment populates promptInstructions
- [ ] User can override auto-filled values
- [ ] **Component tests** in `apps/web/src/features/podcasts/__tests__/`:
  - [ ] `podcast-form-brand-integration.test.tsx`:
    - Brand selector appears and loads brands
    - Selecting brand shows persona/segment selectors
    - Selecting persona auto-fills hostVoice field
    - Selecting segment populates promptInstructions
    - User can override auto-filled values
    - Form submits with brand/persona/segment IDs
**Verification:**
```bash
pnpm --filter web typecheck && pnpm --filter web build && pnpm --filter web test
```
Use `/agent-browser` on localhost:8085:
- Navigate to podcast creation
- Verify brand dropdown appears
- Select brand → verify persona cards appear
- Select persona → verify host voice auto-fills
- Select segment → verify instructions populate
**Details:** [07-podcast-integration.md](./tasks/07-podcast-integration.md)

---

### Task 08: SSE Handler Extension
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/real-time.md`, `standards/frontend/testing.md`
**Acceptance Criteria:**
- [ ] 'brand' added to EntityType in events contract
- [ ] SSE handler invalidates brand queries on update
- [ ] Brand document refreshes when AI updates sections
- [ ] **Component test** (add to existing SSE tests if present):
  - [ ] Brand update event invalidates brand query cache
**Verification:**
```bash
pnpm --filter web typecheck
```
**Details:** [08-sse-handler.md](./tasks/08-sse-handler.md)

---

### Task 09: Navigation & Layout
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/project-structure.md`
**Acceptance Criteria:**
- [ ] "Brands" nav item in sidebar
- [ ] Links to /brands
- [ ] Active state when on brands routes
**Details:** [09-navigation.md](./tasks/09-navigation.md)

---

### Task 99: Final Verification
**Status:** ⏳ NOT_STARTED
**Standards:** All standards referenced in prior tasks
**Acceptance Criteria:**
- [ ] All prior tasks verified by subagent review
- [ ] No standards violations found
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes
**Details:** [99-final-verification.md](./tasks/99-final-verification.md)

---

## Success Criteria

- [ ] **Task 01**: Brand table with personas/segments as JSONB arrays
- [ ] **Task 02**: Repository with CRUD operations, ownership checks
- [ ] **Task 03**: oRPC contracts and routes working
- [ ] **Task 04**: Streaming chat endpoint with tool calls
- [ ] **Task 05**: Brand builder UI with split view chat
- [ ] **Task 06**: Persona cards + segment dropdown working
- [ ] **Task 07**: Podcast form integrates brand selectors
- [ ] **Task 08**: SSE refreshes brand on AI updates
- [ ] **Task 09**: Brands in navigation
- [ ] **Task 99**: All standards verified

Each task maintains working functionality with passing build.

---

## Standards Reference

- `standards/patterns/repository.md` - Repository pattern
- `standards/patterns/use-case.md` - Use case pattern
- `standards/patterns/error-handling.md` - TaggedError pattern
- `standards/patterns/router-handler.md` - API route handlers
- `standards/patterns/serialization.md` - DB → API transforms
- `standards/frontend/components.md` - Container/Presenter
- `standards/frontend/data-fetching.md` - useSuspenseQuery
- `standards/frontend/forms.md` - TanStack Form
- `standards/frontend/mutations.md` - Optimistic updates
- `standards/testing/use-case-tests.md` - Unit tests for use cases
- `standards/testing/integration-tests.md` - Router integration tests
- `standards/frontend/testing.md` - Component tests (Vitest + RTL + MSW)
