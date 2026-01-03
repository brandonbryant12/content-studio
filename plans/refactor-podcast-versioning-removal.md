# Podcast Versioning Removal Implementation Plan

> **STATUS: NOT STARTED**

## Overview

Simplify the podcast system by removing versioning entirely. Currently, podcasts have a separate `podcastScript` table that supports multiple versions per podcast. This refactor flattens the schema by moving script/audio fields directly onto the podcast table. When script or voice settings change, audio is discarded and auto-regenerated.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Schema approach | Flatten `podcastScript` fields into `podcast` table |
| Audio regeneration | Auto-regenerate when script/voice changes |
| Migration | Not needed (pre-production) - drop `podcastScript` table |
| Version history | Removed entirely |

## Validation Commands

```bash
# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter @repo/db build
pnpm --filter @repo/media typecheck
pnpm --filter @repo/media test
pnpm --filter @repo/api typecheck
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter web test

# Full validation (required after each sprint)
pnpm typecheck && pnpm test && pnpm build
```

---

## Target Architecture

```
packages/db/src/schemas/podcasts.ts
├── podcast table                          # All fields consolidated
│   ├── id, title, description, format     # Existing metadata
│   ├── hostVoice, coHostVoice, etc.       # Voice settings
│   ├── status                             # MOVED from podcastScript
│   ├── segments                           # MOVED from podcastScript
│   ├── summary                            # MOVED from podcastScript
│   ├── audioUrl, duration                 # MOVED from podcastScript
│   ├── errorMessage                       # MOVED from podcastScript
│   └── generationPrompt                   # MOVED from podcastScript
└── (podcastScript table DELETED)

packages/media/src/podcast/
├── repos/
│   ├── podcast-repo.ts                    # Extended with status/script ops
│   └── (script-version-repo.ts DELETED)
└── use-cases/
    ├── start-generation.ts                # Simplified, no version creation
    ├── generate-script.ts                 # Updates podcast directly
    ├── generate-audio.ts                  # Updates podcast directly
    ├── save-changes.ts                    # Updates podcast, auto-queues audio
    └── (edit-script.ts DELETED)
    └── (get-active-script.ts DELETED)
    └── (progress-to.ts DELETED)

apps/web/src/features/podcasts/
├── lib/status.ts                          # Simplified status helpers
└── components/
    └── (no activeVersion references)      # Access status directly on podcast
```

---

## Step 0: Familiarize with Standards

**Goal**: Read ALL relevant standards before implementation

### Read All Standards (Required)
- [ ] `/standards/overview.md` - High-level architecture overview
- [ ] `/standards/patterns/repository.md` - Repository pattern
- [ ] `/standards/patterns/use-case.md` - Use case pattern
- [ ] `/standards/patterns/error-handling.md` - Error handling approach
- [ ] `/standards/patterns/router-handler.md` - API router handler pattern
- [ ] `/standards/patterns/serialization.md` - Serialization patterns
- [ ] `/standards/testing/use-case-tests.md` - Use case unit testing patterns
- [ ] `/standards/testing/integration-tests.md` - Router integration testing patterns
- [ ] `/standards/testing/live-tests.md` - Live/E2E testing patterns
- [ ] `/standards/frontend/testing.md` - Frontend component testing patterns
- [ ] `/standards/frontend/data-fetching.md` - Frontend data access patterns

### Review Current Implementation
- [ ] `packages/db/src/schemas/podcasts.ts` - Current schema with podcastScript
- [ ] `packages/media/src/podcast/repos/script-version-repo.ts` - Version management
- [ ] `packages/media/src/podcast/use-cases/*.ts` - All use cases that reference versions
- [ ] `packages/media/src/podcast/use-cases/__tests__/*.ts` - Existing use case tests
- [ ] `packages/api/src/server/router/__tests__/podcast.integration.test.ts` - Existing integration tests
- [ ] `apps/web/src/features/podcasts/lib/status.ts` - UI status handling

**No code changes** - understanding only.

---

## Sprint 1: Schema Migration

**Goal**: Flatten `podcastScript` fields into `podcast` table and drop `podcastScript`

### 1.1 Update `packages/db/src/schemas/podcasts.ts`

Add fields from `podcastScript` to `podcast` table:
- `status` (versionStatusEnum, default 'drafting')
- `segments` (jsonb ScriptSegment[])
- `summary` (text)
- `generationPrompt` (text)
- `audioUrl` (text)
- `duration` (integer)
- `errorMessage` (text)

### 1.2 Remove `podcastScript` table and related code

- Delete `podcastScript` table definition
- Delete `ScriptVersionId` brand usage for this table
- Remove `PodcastScriptOutputSchema` and related schemas
- Remove `ActiveVersionSummarySchema`
- Update `PodcastFullOutputSchema` to include script fields directly (no `activeVersion`)
- Update `PodcastListItemOutputSchema` similarly

### 1.3 Update serializers

- Remove `serializePodcastScript*` functions
- Update `serializePodcastFull` to include status/segments/audio directly
- Update `serializePodcastListItem` to include status/duration directly

### 1.4 Push schema changes

```bash
DB_POSTGRES_URL=postgresql://... pnpm --filter @repo/db exec drizzle-kit push
```

**Validation**: `pnpm --filter @repo/db typecheck && pnpm --filter @repo/db build && pnpm --filter @repo/db test`

---

## Sprint 2: Repository Consolidation

**Goal**: Remove `ScriptVersionRepo`, extend `PodcastRepo` with status operations

### 2.1 Delete `script-version-repo.ts`

Remove `/packages/media/src/podcast/repos/script-version-repo.ts` entirely.

### 2.2 Extend `PodcastRepo` with status operations

Add methods to `PodcastRepoService`:
- `updateStatus(id, status, errorMessage?)` - Update generation status
- `updateScript(id, { segments, summary, generationPrompt })` - Update script content
- `updateAudio(id, { audioUrl, duration })` - Update audio after generation
- `clearAudio(id)` - Clear audio for regeneration

### 2.3 Update `podcast-repo.ts` implementation

Implement new methods. Simplify `findByIdFull` to no longer join with `podcastScript`.

### 2.4 Update repo exports and layers

- Remove `ScriptVersionRepo` from `/packages/media/src/podcast/repos/index.ts`
- Remove from layer composition in `/packages/media/src/podcast/index.ts`

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 3: Use Case Simplification

**Goal**: Update all use cases to work directly with podcast, remove version-specific use cases

### 3.1 Simplify `start-generation.ts`

- Remove version creation logic
- Set podcast status to 'drafting' directly
- Remove `ScriptVersionRepo` dependency

### 3.2 Update `generate-script.ts`

- Update podcast directly via `PodcastRepo.updateScript()`
- Update status on podcast via `PodcastRepo.updateStatus()`
- Remove all `ScriptVersionRepo` references

### 3.3 Update `generate-audio.ts`

- Update podcast directly via `PodcastRepo.updateAudio()`
- Update status on podcast via `PodcastRepo.updateStatus()`
- Change S3 key from `podcasts/{id}/audio-v{version}.wav` to `podcasts/{id}/audio.wav`
- Remove all `ScriptVersionRepo` references

### 3.4 Update `save-changes.ts`

- Work directly with podcast status (not version status)
- Update segments/voice on podcast
- Clear audioUrl/duration
- Auto-queue audio generation job
- Remove version-related error messages

### 3.5 Delete version-specific use cases

Remove these files:
- `edit-script.ts` - No longer needed (save-changes handles edits)
- `get-active-script.ts` - Script is on podcast now
- `progress-to.ts` - No version progression needed

### 3.6 Update use case exports

Update `/packages/media/src/podcast/use-cases/index.ts` to remove deleted use cases.

### 3.7 Update use case unit tests

Update tests in `/packages/media/src/podcast/use-cases/__tests__/`:

**Delete test files for removed use cases:**
- `get-active-script.test.ts` - DELETE (use case removed)

**Update existing test files:**
- `create-podcast.test.ts` - Verify creates podcast with `status: 'drafting'` directly
- `get-podcast.test.ts` - Update to expect flat schema (no `activeVersion`)
- `list-podcasts.test.ts` - Update to expect `status`/`duration` on podcast directly
- `update-podcast.test.ts` - No version references
- `delete-podcast.test.ts` - No version references
- `start-generation.test.ts` - Remove version creation assertions
- `save-and-queue-audio.test.ts` - Update for flat schema, test auto-queue behavior

**Per `/standards/testing/use-case-tests.md`, ensure each test file covers:**
- Success cases (1-3 tests)
- Error cases (1 per error type)
- Edge cases (1-3 tests)
- Authorization (1-2 tests)

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 4: API Layer Updates

**Goal**: Update API contracts and router to remove version references

### 4.1 Update API contracts

File: `/packages/api/src/contracts/podcasts.ts`
- Remove `activeVersion` from response schemas
- Add status/segments/audioUrl/duration directly to podcast output
- Remove version-specific endpoints if any

### 4.2 Update podcast router

File: `/packages/api/src/server/router/podcast.ts`
- Update `getById` to return podcast with script fields (no version join)
- Update `list` to include status/duration directly
- Remove any version-specific routes
- Update `saveChanges` handler to auto-queue audio generation

### 4.3 Update queue job handlers

Ensure generation jobs work with new schema:
- Script generation updates podcast directly
- Audio generation updates podcast directly

### 4.4 Update router integration tests

File: `packages/api/src/server/router/__tests__/podcast.integration.test.ts`

Update integration tests to work with flat schema:
- Remove version-related test cases
- Update mock data to not include `activeVersion`
- Update assertions to check `podcast.status` instead of `podcast.activeVersion?.status`
- Test `saveChanges` handler auto-queues audio generation
- Test status transitions work correctly on flat podcast object
- Ensure all test categories are covered per `/standards/testing/integration-tests.md`:
  - Success cases
  - Authentication
  - Authorization
  - Error responses
  - Response format validation

**Validation**: `pnpm --filter @repo/api typecheck && pnpm --filter @repo/api test`

---

## Sprint 5: Frontend Updates

**Goal**: Remove all `activeVersion` references, access status/script directly on podcast

### 5.1 Update TypeScript types

The API types should auto-generate from contracts. Verify frontend types reflect:
- `podcast.status` instead of `podcast.activeVersion?.status`
- `podcast.segments` instead of `podcast.activeVersion?.segments`
- `podcast.audioUrl` instead of `podcast.activeVersion?.audioUrl`
- `podcast.duration` instead of `podcast.activeVersion?.duration`

### 5.2 Update `lib/status.ts`

File: `apps/web/src/features/podcasts/lib/status.ts`
- Remove references to `activeVersion`
- Status helpers work directly with `podcast.status`

### 5.3 Update `podcast-detail-container.tsx`

File: `apps/web/src/features/podcasts/components/podcast-detail-container.tsx`
- Remove `activeVersion` access pattern
- Access status/segments directly on podcast
- Remove version ID from mutation payloads

### 5.4 Update `podcast-detail.tsx`

File: `apps/web/src/features/podcasts/components/podcast-detail.tsx`
- Props no longer include `activeVersion`
- Status/segments/audio come from podcast directly

### 5.5 Update `podcast-item.tsx`

File: `apps/web/src/features/podcasts/components/podcast-item.tsx`
- Access `podcast.status` and `podcast.duration` directly
- Remove `activeVersion` references
- Update `PodcastListItem` type to have flat fields

### 5.6 Update workbench components

Files in `apps/web/src/features/podcasts/components/workbench/`:
- `workbench-layout.tsx` - Remove `activeVersion` references
- `config-panel.tsx` - Remove `activeVersion` references
- `generation-status.tsx` - Status from podcast directly
- `script-panel.tsx` - Segments from podcast directly
- `audio-player.tsx` - audioUrl from podcast directly

### 5.7 Update hooks

Files in `apps/web/src/features/podcasts/hooks/`:
- `use-optimistic-save-changes.ts` - Remove `activeVersion` references
- `use-optimistic-generation.ts` - Remove `activeVersion` references
- `use-podcast-generation.ts` - Remove version references
- `use-optimistic-create.ts` - Remove version references

### 5.8 Update frontend test mocks and handlers

File: `apps/web/src/features/podcasts/__tests__/handlers.ts`
- Update `createMockPodcastListItem()` factory to use flat schema:
  - Change `activeVersion: { status, duration }` → `status`, `duration` at top level
- Update `mockPodcasts` array with flat schema
- Update all MSW handler responses

### 5.9 Update frontend component tests

File: `apps/web/src/features/podcasts/__tests__/podcast-list.test.tsx`
- Update test assertions to check `podcast.status` instead of `podcast.activeVersion?.status`
- Update mock data usage
- Ensure all component tests pass

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build && pnpm --filter web test`

---

## Sprint 6: Cleanup and Final Testing

**Goal**: Remove dead code, verify full flow works

### 6.1 Search and remove orphaned code

Search for any remaining references to:
- `podcastScript`
- `ScriptVersionRepo`
- `activeVersion`
- `isActive`
- `version:` (in podcast context)

### 6.2 Run full validation

```bash
pnpm typecheck && pnpm build
```

### 6.3 Manual testing

Test complete flow:
1. Create new podcast
2. Configure and generate script
3. Edit script → verify audio auto-regenerates
4. Change voice → verify audio auto-regenerates
5. Verify podcast list shows correct status

### 6.4 Update any affected tests

Fix broken unit/integration tests that reference versions.

**Validation**: `pnpm typecheck && pnpm test && pnpm build`

---

## Key Files to Modify

### Database & Schema
| File | Action |
|------|--------|
| `packages/db/src/schemas/podcasts.ts` | Add script/audio fields to podcast, remove podcastScript table |
| `packages/db/src/schemas/brands.ts` | Remove ScriptVersionId if unused elsewhere |

### Media Package - Repos
| File | Action |
|------|--------|
| `packages/media/src/podcast/repos/script-version-repo.ts` | DELETE |
| `packages/media/src/podcast/repos/podcast-repo.ts` | Add status/script/audio update methods |

### Media Package - Use Cases
| File | Action |
|------|--------|
| `packages/media/src/podcast/use-cases/start-generation.ts` | Remove version creation |
| `packages/media/src/podcast/use-cases/generate-script.ts` | Update podcast directly |
| `packages/media/src/podcast/use-cases/generate-audio.ts` | Update podcast directly |
| `packages/media/src/podcast/use-cases/save-changes.ts` | Work with podcast, auto-queue audio |
| `packages/media/src/podcast/use-cases/edit-script.ts` | DELETE |
| `packages/media/src/podcast/use-cases/get-active-script.ts` | DELETE |
| `packages/media/src/podcast/use-cases/progress-to.ts` | DELETE |

### Media Package - Unit Tests
| File | Action |
|------|--------|
| `packages/media/src/podcast/use-cases/__tests__/get-active-script.test.ts` | DELETE |
| `packages/media/src/podcast/use-cases/__tests__/create-podcast.test.ts` | Update for flat schema |
| `packages/media/src/podcast/use-cases/__tests__/get-podcast.test.ts` | Update for flat schema |
| `packages/media/src/podcast/use-cases/__tests__/list-podcasts.test.ts` | Update for flat schema |
| `packages/media/src/podcast/use-cases/__tests__/start-generation.test.ts` | Remove version assertions |
| `packages/media/src/podcast/use-cases/__tests__/save-and-queue-audio.test.ts` | Update for flat schema |

### API Package
| File | Action |
|------|--------|
| `packages/api/src/contracts/podcasts.ts` | Remove activeVersion from schemas |
| `packages/api/src/server/router/podcast.ts` | Update handlers for flat schema |
| `packages/api/src/server/router/__tests__/podcast.integration.test.ts` | Update integration tests |

### Frontend - Components
| File | Action |
|------|--------|
| `apps/web/src/features/podcasts/lib/status.ts` | Remove activeVersion references |
| `apps/web/src/features/podcasts/components/podcast-item.tsx` | Flat schema access |
| `apps/web/src/features/podcasts/components/podcast-detail.tsx` | Flat schema access |
| `apps/web/src/features/podcasts/components/podcast-detail-container.tsx` | Flat schema access |
| `apps/web/src/features/podcasts/components/workbench/workbench-layout.tsx` | Remove activeVersion |
| `apps/web/src/features/podcasts/components/workbench/config-panel.tsx` | Remove activeVersion |

### Frontend - Hooks
| File | Action |
|------|--------|
| `apps/web/src/features/podcasts/hooks/use-optimistic-save-changes.ts` | Remove activeVersion |
| `apps/web/src/features/podcasts/hooks/use-optimistic-generation.ts` | Remove activeVersion |

### Frontend - Tests
| File | Action |
|------|--------|
| `apps/web/src/features/podcasts/__tests__/handlers.ts` | Update mock factories for flat schema |
| `apps/web/src/features/podcasts/__tests__/podcast-list.test.tsx` | Update assertions for flat schema |

---

## Success Criteria

- [ ] **Sprint 1**: Schema flattened, `podcastScript` table removed, DB typecheck + build + tests pass
- [ ] **Sprint 2**: `ScriptVersionRepo` deleted, `PodcastRepo` extended, media typecheck + tests pass
- [ ] **Sprint 3**: All use cases updated, use case tests updated, media typecheck + tests pass
- [ ] **Sprint 4**: API contracts/router updated, API tests updated, API typecheck + tests pass
- [ ] **Sprint 5**: Frontend updated, component tests updated, web typecheck + build + tests pass
- [ ] **Sprint 6**: Full flow works manually, no orphaned code, `pnpm typecheck && pnpm test && pnpm build` passes

**Testing requirements per sprint**:
- Each sprint MUST pass all tests before moving to the next sprint
- Update/remove tests that reference deleted code (versions, `activeVersion`, etc.)
- Do not skip failing tests - fix them as part of the sprint

---

## Standards Reference

### Backend Patterns
- `/standards/overview.md` - High-level architecture
- `/standards/patterns/repository.md` - Repository pattern for PodcastRepo extensions
- `/standards/patterns/use-case.md` - Use case pattern for updated use cases
- `/standards/patterns/error-handling.md` - Error handling in use cases
- `/standards/patterns/router-handler.md` - API router handler pattern
- `/standards/patterns/serialization.md` - Serialization patterns

### Testing Standards
- `/standards/testing/use-case-tests.md` - Use case unit testing patterns
- `/standards/testing/integration-tests.md` - Router integration testing patterns
- `/standards/testing/live-tests.md` - Live/E2E testing patterns

### Frontend Standards
- `/standards/frontend/data-fetching.md` - Frontend data access patterns
- `/standards/frontend/testing.md` - Frontend component testing patterns
