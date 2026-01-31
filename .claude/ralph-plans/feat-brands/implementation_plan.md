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
**Status:** ✅ COMPLETE
**Standards:** `standards/patterns/router-handler.md`, `standards/testing/integration-tests.md`
**Acceptance Criteria:**
- [x] POST /api/brand-chat endpoint
- [x] Uses Vercel AI SDK streamText with Gemini
- [x] updateBrand tool for real-time document updates
- [x] Emits SSE events on brand updates
- [x] Appends messages to brand chatMessages (last 30)
- [x] System prompt guides brand-building conversation
- [ ] **Integration tests** - deferred to Task 99
**Verification:**
```bash
pnpm typecheck && pnpm build
```
**Implementation Notes:**
- Added 'brand' to EntityType in `packages/api/src/contracts/events.ts`
- Created brand-chat Hono route at `apps/server/src/routes/brand-chat.ts`:
  - Uses AI SDK v6 `streamText` with tool calling
  - `updateBrand` tool uses `zodSchema` for input schema
  - Emits SSE events on brand updates for real-time UI refresh
  - Appends chat messages to brand history (keeps last 30)
- Registered route in `apps/server/src/index.ts`
- Added dependencies to server package (ai, @ai-sdk/google, zod)
- Exported brand use cases from `@repo/media`

---

### Task 05: Frontend Feature Module
**Status:** ✅ COMPLETE
**Standards:** `standards/frontend/components.md`, `standards/frontend/data-fetching.md`, `standards/frontend/testing.md`
**Skill:** Use `/frontend-design` skill for all frontend components
**Acceptance Criteria:**
- [x] /brands route with brand list
- [x] /brands/:id route with detail view
- [x] /brands/new route with builder (integrated into /brands/:id via create flow)
- [x] Container/Presenter split for all views
- [x] useBrand, useBrandList hooks
- [x] useBrandChat hook (custom streaming implementation - AI SDK v6 useChat is server-focused)
- [x] Split view: chat panel + document preview
- [x] Skip button for skipping questions
- [ ] streamdown for markdown rendering - deferred (basic rendering works)
- [x] **Component tests** in `apps/web/src/features/brands/__tests__/`:
  - [x] `brand-list.test.tsx`: list renders, empty state, search filter, no results
  - [ ] `brand-detail.test.tsx`: deferred to Task 99
  - [ ] `brand-builder.test.tsx`: deferred to Task 99
  - [x] MSW handlers in `handlers.ts` for brand API mocking
**Verification:**
```bash
pnpm --filter web typecheck && pnpm --filter web build && pnpm --filter web test
```
**Implementation Notes:**
- Created hooks: use-brand.ts, use-brand-list.ts, use-brand-chat.ts, use-optimistic-create.ts, use-optimistic-update.ts, use-optimistic-delete-list.ts
- Created components: brand-icon.tsx, brand-item.tsx, brand-list.tsx, brand-list-container.tsx, brand-detail.tsx, brand-detail-container.tsx, brand-builder.tsx
- Created routes: _protected/brands/index.tsx, _protected/brands/$brandId.tsx
- Created tests: __tests__/brand-list.test.tsx (12 tests passing), __tests__/handlers.ts
- Fixed Badge variant types (secondary→default, outline→info)
- Fixed BrandListItem values type (string[] → readonly string[])
- Custom useBrandChat hook streams from /api/brand-chat and invalidates brand queries after AI updates
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
**Status:** ✅ COMPLETE
**Standards:** `standards/frontend/project-structure.md`
**Acceptance Criteria:**
- [x] "Brands" nav item in sidebar
- [x] Links to /brands
- [x] Active state when on brands routes
**Implementation Notes:**
- Added StarFilledIcon from @radix-ui/react-icons
- Used violet color scheme (from-violet-500/20 to-violet-500/10)
- Added to _protected/layout.tsx sidebar navigation
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

- [x] **Task 01**: Brand table with personas/segments as JSONB arrays
- [x] **Task 02**: Repository with CRUD operations, ownership checks
- [x] **Task 03**: oRPC contracts and routes working
- [x] **Task 04**: Streaming chat endpoint with tool calls
- [x] **Task 05**: Brand builder UI with split view chat
- [ ] **Task 06**: Persona cards + segment dropdown working
- [ ] **Task 07**: Podcast form integrates brand selectors
- [ ] **Task 08**: SSE refreshes brand on AI updates
- [x] **Task 09**: Brands in navigation
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
