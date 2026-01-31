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
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/use-case.md`, `standards/patterns/error-handling.md`
**Acceptance Criteria:**
- [ ] BrandRepo with findById, list, insert, update, delete methods
- [ ] BrandNotFound, NotBrandOwner error types
- [ ] create-brand use case with ownership
- [ ] get-brand use case with ownership check
- [ ] update-brand use case
- [ ] delete-brand use case
- [ ] append-chat-message use case (manages last N)
- [ ] Unit tests for use cases
**Details:** [02-repository-use-cases.md](./tasks/02-repository-use-cases.md)

---

### Task 03: API Contracts & Routes
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/router-handler.md`
**Acceptance Criteria:**
- [ ] brands.list contract and route
- [ ] brands.get contract and route
- [ ] brands.create contract and route
- [ ] brands.update contract and route
- [ ] brands.delete contract and route
- [ ] Proper error mapping to HTTP status codes
**Details:** [03-api-routes.md](./tasks/03-api-routes.md)

---

### Task 04: Streaming Chat Endpoint
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/router-handler.md`
**Acceptance Criteria:**
- [ ] POST /api/brand-chat endpoint
- [ ] Uses Vercel AI SDK streamText with Gemini
- [ ] updateBrand tool for real-time document updates
- [ ] Emits SSE events on brand updates
- [ ] Appends messages to brand chatMessages (last 30)
- [ ] System prompt guides brand-building conversation
**Details:** [04-streaming-chat.md](./tasks/04-streaming-chat.md)

---

### Task 05: Frontend Feature Module
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`, `standards/frontend/data-fetching.md`
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
**Verification:**
```bash
pnpm --filter web typecheck && pnpm --filter web build
```
Use `/agent-browser` on localhost:8085 (login: b@b.com / 12345678):
- Navigate to /brands - verify list renders
- Navigate to /brands/new - verify builder displays
- Send message and verify streaming works
**Details:** [05-frontend-module.md](./tasks/05-frontend-module.md)

---

### Task 06: Persona & Segment Selectors
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`, `standards/frontend/forms.md`
**Skill:** Use `/frontend-design` skill for polished selector components
**Acceptance Criteria:**
- [ ] BrandSelector dropdown component
- [ ] PersonaSelector card gallery (like voice-selector.tsx)
- [ ] SegmentSelector dropdown with descriptions
- [ ] Persona selection auto-sets voiceId
- [ ] Segment selection provides messaging tone
**Details:** [06-selectors.md](./tasks/06-selectors.md)

---

### Task 07: Podcast Form Integration
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/forms.md`
**Acceptance Criteria:**
- [ ] Optional brand dropdown in podcast setup
- [ ] Persona dropdown appears when brand selected
- [ ] Selecting persona auto-fills hostVoice
- [ ] Segment dropdown for target audience
- [ ] Selecting segment populates promptInstructions
- [ ] User can override auto-filled values
**Verification:**
```bash
pnpm --filter web typecheck && pnpm --filter web build
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
**Standards:** `standards/frontend/real-time.md`
**Acceptance Criteria:**
- [ ] 'brand' added to EntityType in events contract
- [ ] SSE handler invalidates brand queries on update
- [ ] Brand document refreshes when AI updates sections
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
