# Voice Overs Implementation Plan

> **STATUS: 🟡 IN PROGRESS**

## Issues Found in Review

### ✅ CRITICAL (Fixed)

#### 1. ~~Voiceover Worker Not Started~~ ✅ FIXED
- **File**: `apps/server/src/server.ts`
- **Issue**: ~~`createVoiceoverWorker()` is exported but never instantiated at server startup~~
- **Resolution**: Worker is now started alongside podcast worker in `server.ts`
- **Sprint**: 12.1 ✅

#### 2. ~~Missing Authorization in Use Cases~~ ✅ FIXED
| Use Case | File | Status |
|----------|------|--------|
| `update-voiceover.ts` | `packages/media/src/voiceover/use-cases/` | ✅ Owner check added |
| `delete-voiceover.ts` | `packages/media/src/voiceover/use-cases/` | ✅ Owner check added |
| `generate-audio.ts` | `packages/media/src/voiceover/use-cases/` | ✅ Owner check added |
| `start-generation.ts` | `packages/media/src/voiceover/use-cases/` | ✅ Owner check added |

- **Resolution**: All use cases now verify `voiceover.createdBy === input.userId` before performing actions
- **Sprint**: 12.2 ✅

### ✅ HIGH Priority (Fixed)

#### 3. ~~Zero Test Coverage~~ ✅ FIXED
| Layer | Status |
|-------|--------|
| Backend use case tests | ✅ 72 tests |
| Backend integration tests | ✅ 62 tests |
| Frontend component tests | ✅ 45 tests |
| MSW handlers | ✅ Created |
| E2E tests | ✅ 42 tests |

- **Resolution**: Comprehensive test coverage added in Sprint 13
- **Sprint**: 13 ✅

### ✅ MEDIUM Priority (Fixed)

#### 4. ~~ApproveButton Violates Presenter Pattern~~ ✅ FIXED
- **File**: `apps/web/src/features/voiceovers/components/collaborators/approve-button.tsx`
- **Resolution**: Refactored to receive `onApprove`, `onRevoke`, and `isPending` as props. Container now provides callbacks.
- **Sprint**: 14.1 ✅

#### 5. ~~Voice Constants Duplicated~~ ✅ FIXED
- **Resolution**: Created shared `lib/voices.ts` exporting `VOICES` array. Both files now import from single source.
- **Sprint**: 14.2 ✅

---

## Overview

Add a "Voice Overs" feature - a simpler alternative to podcasts where users enter text directly and generate TTS audio. No script generation or setup wizard; just a workbench with a text area, voice selector, and generate button. Supports collaborators and approval workflow like podcasts.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Database | Separate `voiceover` table (not shared with podcasts) |
| Backend | Separate domain in `packages/media/src/voiceover/` |
| Frontend | Separate feature folder `apps/web/src/features/voiceovers/` |
| Status enum | Simpler: `drafting` → `generating_audio` → `ready` / `failed` |
| Abstraction | Share infrastructure (TTS, queue, SSE), copy patterns, don't share components |

## Validation Commands

```bash
# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter @repo/media typecheck
pnpm --filter @repo/api typecheck
pnpm --filter web typecheck

# Full validation
pnpm typecheck && pnpm test && pnpm build
```

---

## Target Architecture

```
packages/db/src/schemas/
├── voiceovers.ts                    # NEW: voiceover + voiceoverCollaborator tables

packages/media/src/
├── voiceover/                       # NEW: voice over domain
│   ├── index.ts
│   ├── repos/
│   │   ├── voiceover-repo.ts
│   │   └── collaborator-repo.ts
│   └── use-cases/
│       ├── create-voiceover.ts
│       ├── update-voiceover.ts
│       ├── delete-voiceover.ts
│       ├── get-voiceover.ts
│       ├── list-voiceovers.ts
│       ├── generate-audio.ts        # Text → TTS → storage
│       ├── add-collaborator.ts
│       ├── remove-collaborator.ts
│       ├── list-collaborators.ts
│       ├── approve-voiceover.ts
│       └── claim-pending-invites.ts

packages/api/src/
├── contracts/voiceovers.ts          # NEW: oRPC contract
└── server/router/voiceover.ts       # NEW: route handlers

apps/server/src/workers/
└── voiceover-worker.ts              # NEW: job processor

apps/web/src/features/voiceovers/    # NEW: frontend feature
├── components/
│   ├── voiceover-list.tsx
│   ├── voiceover-detail-container.tsx
│   ├── voiceover-detail.tsx
│   └── workbench/
│       ├── workbench-layout.tsx
│       ├── text-editor.tsx          # Main textarea
│       ├── voice-selector.tsx
│       ├── generation-status.tsx
│       └── action-bar.tsx
├── hooks/
│   ├── use-voiceover.ts
│   ├── use-voiceover-list.ts
│   ├── use-optimistic-generation.ts
│   ├── use-voiceover-settings.ts
│   └── use-collaborators.ts
├── lib/
│   └── status.ts
└── __tests__/
```

---

## Step 0: Familiarize with Standards

**Goal**: Read and understand all relevant standards before implementation

### Read Standards
- [ ] `standards/patterns/use-case.md` - Backend use case pattern
- [ ] `standards/patterns/repository.md` - Repository pattern
- [ ] `standards/patterns/error-handling.md` - Error handling
- [ ] `standards/patterns/enum-constants.md` - Status enum pattern
- [ ] `standards/frontend/components.md` - Container/presenter pattern
- [ ] `standards/frontend/mutations.md` - Optimistic updates
- [ ] `standards/frontend/data-fetching.md` - Query patterns

### Review Podcast Implementation
- [ ] `packages/db/src/schemas/podcasts.ts` - Schema structure
- [ ] `packages/media/src/podcast/repos/podcast-repo.ts` - Repository pattern
- [ ] `packages/media/src/podcast/use-cases/generate-audio.ts` - TTS generation
- [ ] `apps/web/src/features/podcasts/components/workbench/` - Workbench UI

**No code changes in this step** - understanding only.

---

## Sprint 1: Database Schema & Migrations

**Goal**: Create database tables for voice overs

### 1.1 Create `packages/db/src/schemas/voiceovers.ts`

```typescript
export const voiceoverStatusEnum = pgEnum('voiceover_status', [
  'drafting',
  'generating_audio',
  'ready',
  'failed'
]);

export const VoiceoverStatus = {
  DRAFTING: 'drafting',
  GENERATING_AUDIO: 'generating_audio',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const voiceover = pgTable('voiceover', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  text: text('text').notNull().default(''),
  voice: varchar('voice', { length: 100 }).notNull().default('Charon'),
  voiceName: varchar('voice_name', { length: 100 }),
  audioUrl: varchar('audio_url', { length: 500 }),
  duration: integer('duration'),
  status: voiceoverStatusEnum('status').notNull().default('drafting'),
  errorMessage: text('error_message'),
  ownerHasApproved: boolean('owner_has_approved').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const voiceoverCollaborator = pgTable('voiceover_collaborator', {
  id: uuid('id').primaryKey().defaultRandom(),
  voiceoverId: uuid('voiceover_id').notNull().references(() => voiceover.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => user.id),
  email: varchar('email', { length: 255 }).notNull(),
  hasApproved: boolean('has_approved').notNull().default(false),
  approvedAt: timestamp('approved_at'),
  addedAt: timestamp('added_at').notNull().defaultNow(),
  addedBy: uuid('added_by').notNull().references(() => user.id),
}, (table) => ({
  uniqueEmailPerVoiceover: unique().on(table.voiceoverId, table.email),
}));
```

### 1.2 Export from `packages/db/src/schema.ts`

### 1.3 Add serializers (pure + Effect-based batch)

### 1.4 Run migration
```bash
pnpm --filter @repo/db exec drizzle-kit push
```

**Validation**: `pnpm --filter @repo/db typecheck && pnpm --filter @repo/db build`

---

## Sprint 2: Backend Repositories

**Goal**: Database access layer for voice overs

### 2.1 Create `packages/media/src/voiceover/repos/voiceover-repo.ts`
- `insert()`, `findById()`, `update()`, `delete()`, `list()`, `count()`
- `updateStatus()`, `updateAudio()`, `clearAudio()`
- `clearApprovals()`, `setOwnerApproval()`

### 2.2 Create `packages/media/src/voiceover/repos/collaborator-repo.ts`
- Same pattern as podcast collaborator repo
- `add()`, `remove()`, `findByPodcast()`, `approve()`, `revoke()`

### 2.3 Export from `packages/media/src/voiceover/index.ts`

### 2.4 Add to media package exports

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media build`

---

## Sprint 3: Backend Use Cases - Core

**Goal**: Business logic for CRUD and generation

### 3.1 Create core use cases
- `create-voiceover.ts` - Create with title, set drafting status
- `update-voiceover.ts` - Update title, text, voice
- `delete-voiceover.ts` - Hard delete
- `get-voiceover.ts` - Load single voice over
- `list-voiceovers.ts` - List owned + collaborated

### 3.2 Create `generate-audio.ts`
- Validate text is not empty
- Set `generating_audio` status
- Call TTS service with single voice
- Upload to storage at `voiceovers/{id}/audio.wav`
- Set `ready` status with audioUrl/duration
- Clear approvals on generation start

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 4: Backend Use Cases - Collaboration

**Goal**: Collaborator and approval logic

### 4.1 Create collaboration use cases
- `add-collaborator.ts` - Owner-only, email lookup, prevent duplicates
- `remove-collaborator.ts` - Owner-only
- `list-collaborators.ts` - List with user info
- `approve-voiceover.ts` - Toggle owner/collaborator approval
- `claim-pending-invites.ts` - Associate pending invites with user

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 5: API Contract & Router

**Goal**: HTTP API for voice overs

### 5.1 Create `packages/api/src/contracts/voiceovers.ts`

```
GET    /voiceovers                    # List (owned + collaborated)
POST   /voiceovers                    # Create (title only)
GET    /voiceovers/:id                # Get single
PATCH  /voiceovers/:id                # Update (title, text, voice)
DELETE /voiceovers/:id                # Delete

POST   /voiceovers/:id/generate       # Start TTS → returns jobId
GET    /voiceovers/jobs/:jobId        # Poll job status

GET    /voiceovers/:id/collaborators  # List collaborators
POST   /voiceovers/:id/collaborators  # Add by email
DELETE /voiceovers/:id/collaborators/:collaboratorId

POST   /voiceovers/:id/approve        # Toggle approval
DELETE /voiceovers/:id/approve        # Revoke approval

POST   /voiceovers/claim-invites      # Claim pending invites
```

### 5.2 Create `packages/api/src/server/router/voiceover.ts`

### 5.3 Register router in main app

### 5.4 Add job type: `'generate-voiceover-audio'`

**Validation**: `pnpm --filter @repo/api typecheck && pnpm --filter @repo/api build`

---

## Sprint 6: Background Worker

**Goal**: Process voice over generation jobs

### 6.1 Create `apps/server/src/workers/voiceover-worker.ts`

### 6.2 Add handler for `generate-voiceover-audio` job type

### 6.3 Emit SSE events on completion
- `job_completion` event with status
- `entity_change` event for cache invalidation

### 6.4 Register worker in server startup

**Validation**: `pnpm --filter server typecheck && pnpm --filter server build`

---

## Sprint 7: Frontend - Routes & List

**Goal**: Voice over list page

### 7.1 Create routes
- `/voiceovers` - List page
- `/voiceovers/$voiceoverId` - Detail/workbench page

### 7.2 Create `voiceover-list.tsx`
- Grid/list of voice overs with title, status, duration
- Create new button

### 7.3 Create `use-voiceover-list.ts` hook

### 7.4 Add navigation link to voice overs in sidebar/nav

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 8: Frontend - Workbench Core

**Goal**: Main voice over editing interface

### 8.1 Create `workbench-layout.tsx`
- Header with title, status badge, collaborator avatars
- Main content area
- Action bar

### 8.2 Create `text-editor.tsx`
- Textarea for voice over text
- Character count
- Disabled during generation

### 8.3 Create `voice-selector.tsx`
- Dropdown with voice options (from TTS voices)
- Preview voice button (optional)

### 8.4 Create query/state hooks
- `use-voiceover.ts` - Main query hook
- `use-voiceover-settings.ts` - Local state tracking for text/voice changes

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 9: Frontend - Generation & Real-time

**Goal**: TTS generation with real-time updates

### 9.1 Create `action-bar.tsx`
- Generate button (enabled when text exists)
- Disabled during generation

### 9.2 Create `generation-status.tsx`
- Progress indicator during generation
- Error display on failure

### 9.3 Create `use-optimistic-generation.ts`
- Optimistic status update to `generating_audio`
- Rollback on error

### 9.4 Wire up SSE handlers
- Add voiceover to entity change handler
- Invalidate queries on updates

### 9.5 Create `lib/status.ts`
- Status config and helpers
- `isGenerating()`, `isReady()`, `canEdit()`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web test`

---

## Sprint 10: Frontend - Collaboration

**Goal**: Collaborator management and approval

### 10.1 Add collaborator avatars to workbench header

### 10.2 Add approve button
- Copy pattern from podcasts
- Toggle approval state

### 10.3 Add manage collaborators dialog
- List collaborators with approval status
- Add by email
- Remove collaborator

### 10.4 Create collaboration hooks
- `use-collaborators.ts`
- `use-add-collaborator.ts`
- `use-remove-collaborator.ts`
- `use-approve-voiceover.ts`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web test`

---

## Sprint 11: Testing & Polish

**Goal**: Tests and edge cases

### 11.1 Add MSW handlers for voice over endpoints

### 11.2 Add component tests for workbench

### 11.3 Add E2E tests
- Create voice over
- Edit text and voice
- Generate audio
- Play audio
- Collaborator flow

### 11.4 Handle edge cases
- Empty text validation (disable generate)
- Generation in progress (disable editing)
- Failed generation (show error, allow retry)
- Long text handling

**Validation**: `pnpm typecheck && pnpm test && pnpm build`

---

## Sprint 12: Critical Fixes

**Goal**: Fix blocking issues preventing feature from working

### 12.1 Register Voiceover Worker at Server Startup

**File**: `apps/server/src/server.ts`

Add voiceover worker creation alongside podcast worker:

```typescript
// Create voiceover worker
const voiceoverWorker = createVoiceoverWorker({
  databaseUrl: env.SERVER_POSTGRES_URL,
  pollInterval: QUEUE_DEFAULTS.POLL_INTERVAL_MS,
  geminiApiKey: env.GEMINI_API_KEY,
  storageConfig,
  useMockAI: env.USE_MOCK_AI,
});

// Start both workers
Promise.all([
  worker.start(),
  voiceoverWorker.start(),
]).catch((error) => {
  console.error('Worker error:', error);
  process.exit(1);
});
```

### 12.2 Add Authorization Checks to Use Cases

Add owner verification to these use cases:

#### 12.2.1 `update-voiceover.ts`
```typescript
// After findById, before update:
const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

if (voiceover.createdBy !== input.userId) {
  return yield* Effect.fail(
    new NotVoiceoverOwner({
      voiceoverId: input.voiceoverId,
      userId: input.userId,
    }),
  );
}
```

#### 12.2.2 `delete-voiceover.ts`
```typescript
// After findById, before delete:
if (voiceover.createdBy !== input.userId) {
  return yield* Effect.fail(
    new NotVoiceoverOwner({
      voiceoverId: input.voiceoverId,
      userId: input.userId,
    }),
  );
}
```

#### 12.2.3 `generate-audio.ts`
```typescript
// After findById, before generation:
if (voiceover.createdBy !== input.userId) {
  return yield* Effect.fail(
    new NotVoiceoverOwner({
      voiceoverId: input.voiceoverId,
      userId: input.userId,
    }),
  );
}
```

#### 12.2.4 `start-generation.ts`
```typescript
// After findById, before enqueue:
if (voiceover.createdBy !== input.userId) {
  return yield* Effect.fail(
    new NotVoiceoverOwner({
      voiceoverId: input.voiceoverId,
      userId: input.userId,
    }),
  );
}
```

**Validation**: `pnpm typecheck && pnpm build`

---

## Sprint 13: Test Coverage

**Goal**: Add comprehensive test coverage

### 13.1 Backend Use Case Tests

**Location**: `packages/media/src/voiceover/use-cases/__tests__/`

Priority order:
1. `approve-voiceover.test.ts` - Complex owner vs collaborator logic
2. `add-collaborator.test.ts` - 5 error conditions, validation
3. `generate-audio.test.ts` - TTS integration, state transitions
4. `start-generation.test.ts` - Queue integration, idempotency
5. `update-voiceover.test.ts` - Authorization checks
6. `delete-voiceover.test.ts` - Authorization, cascade
7. Remaining CRUD use cases

Each test file should cover:
- Success paths (1-3 tests)
- All error conditions (1 test per error type)
- Edge cases (1-3 tests)
- Authorization (1-2 tests)

### 13.2 Backend Integration Tests

**Location**: `packages/api/src/server/router/__tests__/voiceover.integration.test.ts`

Test all 13 API handlers:
- Success responses with correct serialization
- Authentication (null user → UNAUTHORIZED)
- Authorization (other user → NOT_FOUND or FORBIDDEN)
- Error responses (specific error codes)
- Pagination/filtering (for list operations)

Reference: `packages/api/src/server/router/__tests__/podcast.integration.test.ts`

### 13.3 MSW Handlers

**Location**: `apps/web/src/features/voiceovers/__tests__/handlers.ts`

Create handlers for:
- Core CRUD (list, get, create, update, delete)
- Generation (generate, getJob with pending/complete states)
- Collaboration (listCollaborators, add, remove, approve)
- Error scenarios

### 13.4 Frontend Component Tests

**Location**: `apps/web/src/features/voiceovers/__tests__/`

Priority components:
1. `voiceover-detail-container.test.tsx`
2. `approve-button.test.tsx`
3. `action-bar.test.tsx`
4. `add-collaborator-dialog.test.tsx`

### 13.5 E2E Tests

**Location**: `apps/web/e2e/tests/voiceovers/`

Critical flows:
1. Create & edit voiceover
2. Generate audio (with status polling)
3. Collaboration workflow (add collaborator, approve)

**Validation**: `pnpm test`

---

## Sprint 14: Code Quality Fixes

**Goal**: Address medium priority issues

### 14.1 Fix ApproveButton Presenter Pattern

**File**: `apps/web/src/features/voiceovers/components/collaborators/approve-button.tsx`

Refactor to receive mutations as props:

```typescript
interface ApproveButtonProps {
  voiceoverId: string;
  currentUserHasApproved: boolean;
  isOwner: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  isPending: boolean;
}

export function ApproveButton({
  currentUserHasApproved,
  onApprove,
  onRevoke,
  isPending,
}: ApproveButtonProps) {
  // Pure presenter - no hooks
}
```

Update container to pass mutations:
```typescript
const approveMutation = useApproveVoiceover(voiceoverId);
const revokeMutation = useRevokeVoiceoverApproval(voiceoverId);

<ApproveButton
  currentUserHasApproved={currentUserHasApproved}
  onApprove={() => approveMutation.mutate({ id: voiceoverId })}
  onRevoke={() => revokeMutation.mutate({ id: voiceoverId })}
  isPending={approveMutation.isPending || revokeMutation.isPending}
/>
```

### 14.2 Consolidate Voice Constants

**Action**: Export VOICES from single location

Option A: Export from hook
```typescript
// use-voiceover-settings.ts
export const VOICES = [...];
```

```typescript
// voice-selector.tsx
import { VOICES } from '../hooks/use-voiceover-settings';
```

Option B: Create shared constants file
```typescript
// lib/constants.ts
export const VOICES = [...];
```

**Validation**: `pnpm typecheck && pnpm build`

---

## Sprint 15: Standards Review & Iteration

**Goal**: Final validation with comprehensive subagent review

### 15.1 Spawn Subagent Reviews (8 parallel agents)

Run comprehensive review covering:

1. **DB Schema & Serializers Agent**
   - Verify schema completeness
   - Check serializer patterns (Effect, Batch, Sync)
   - Validate type exports

2. **Backend Repositories Agent**
   - Verify all required methods exist
   - Check Effect patterns and error handling
   - Compare with podcast repo patterns

3. **Backend Use Cases Agent**
   - Verify authorization checks added
   - Check Effect patterns and tracing spans
   - Validate error propagation

4. **API Contract & Router Agent**
   - Verify all endpoints defined
   - Check error definitions match
   - Validate handler patterns

5. **Background Worker Agent**
   - Verify worker is started at startup
   - Check SSE event emission
   - Validate error handling

6. **Frontend Components Agent**
   - Verify container/presenter pattern
   - Check data fetching patterns
   - Validate optimistic mutations

7. **Test Coverage Agent**
   - Verify use case tests exist
   - Check integration tests
   - Validate component tests and MSW handlers

8. **Standards Compliance Agent**
   - Cross-check all standards documents
   - Verify consistency with podcast implementation
   - Check for any remaining issues

### 15.2 Update Implementation Plan

Based on subagent findings:
- Add any new issues to "Issues Found in Review" section
- Create new sprints if critical issues discovered
- Update success criteria checkboxes
- Document lessons learned

### 15.3 Final Validation

```bash
pnpm typecheck && pnpm test && pnpm build
```

All tests must pass before marking feature complete.

### 15.4 Completion Criteria

- [ ] All 8 subagent reviews pass with no critical issues
- [ ] All tests pass (unit, integration, component, E2E)
- [ ] Build succeeds
- [ ] No open issues in "Issues Found" section
- [ ] Implementation plan status updated to ✅ COMPLETE

**Validation**: Full review + `pnpm typecheck && pnpm test && pnpm build`

---

## Key Files to Modify

| File | Action | Sprint |
|------|--------|--------|
| `packages/db/src/schemas/voiceovers.ts` | Create - new schema | 1 ✅ |
| `packages/db/src/schema.ts` | Modify - export new tables | 1 ✅ |
| `packages/media/src/voiceover/` | Create - entire domain | 2-4 ✅ |
| `packages/api/src/contracts/voiceovers.ts` | Create - API contract | 5 ✅ |
| `packages/api/src/server/router/voiceover.ts` | Create - route handlers | 5 ✅ |
| `apps/server/src/workers/voiceover-worker.ts` | Create - job processor | 6 ✅ |
| `apps/web/src/features/voiceovers/` | Create - entire feature | 7-10 ✅ |
| `apps/web/src/shared/hooks/sse-handlers.ts` | Modify - add voiceover entity | 9 ✅ |
| `apps/server/src/server.ts` | Modify - register voiceover worker | 12 ✅ |
| `packages/media/src/voiceover/use-cases/update-voiceover.ts` | Modify - add owner check | 12 ✅ |
| `packages/media/src/voiceover/use-cases/delete-voiceover.ts` | Modify - add owner check | 12 ✅ |
| `packages/media/src/voiceover/use-cases/generate-audio.ts` | Modify - add owner check | 12 ✅ |
| `packages/media/src/voiceover/use-cases/start-generation.ts` | Modify - add owner check | 12 ✅ |
| `packages/media/src/voiceover/use-cases/__tests__/` | Create - use case tests | 13 ✅ |
| `packages/api/src/server/router/__tests__/voiceover.integration.test.ts` | Create - integration tests | 13 ✅ |
| `apps/web/src/features/voiceovers/__tests__/handlers.ts` | Create - MSW handlers | 13 ✅ |
| `apps/web/src/features/voiceovers/__tests__/*.test.tsx` | Create - component tests | 13 ✅ |
| `apps/web/e2e/tests/voiceovers/` | Create - E2E tests | 13 ✅ |
| `apps/web/src/features/voiceovers/components/collaborators/approve-button.tsx` | Modify - presenter pattern | 14 ✅ |
| `apps/web/src/features/voiceovers/lib/voices.ts` | Create - shared constants | 14 ✅ |

---

## Success Criteria

- [x] **Sprint 1**: Database tables created and migrated
- [x] **Sprint 2**: Repositories with full CRUD
- [x] **Sprint 3**: Core use cases working
- [x] **Sprint 4**: Collaboration use cases working
- [x] **Sprint 5**: API endpoints accessible
- [x] **Sprint 6**: Background jobs processing
- [x] **Sprint 7**: List page renders voice overs
- [x] **Sprint 8**: Workbench edits text/voice
- [x] **Sprint 9**: Generation triggers and updates in real-time
- [x] **Sprint 10**: Collaborators can be added and approve
- [x] **Sprint 11**: Tests pass, edge cases handled
- [x] **Sprint 12**: Critical fixes (worker startup, authorization)
- [x] **Sprint 13**: Test coverage (use case, integration, component, E2E)
- [x] **Sprint 14**: Code quality fixes (presenter pattern, constants)
- [ ] **Sprint 15**: Standards review with 8 subagents, iterate on findings

Each sprint maintains working functionality with passing build.

---

## Standards Reference

- `standards/patterns/use-case.md` - Backend use case pattern
- `standards/patterns/repository.md` - Repository pattern
- `standards/patterns/error-handling.md` - Error handling
- `standards/patterns/enum-constants.md` - Status enum pattern
- `standards/frontend/components.md` - Container/presenter pattern
- `standards/frontend/mutations.md` - Optimistic updates
- `standards/frontend/data-fetching.md` - Query patterns
- `standards/frontend/testing.md` - Component testing
