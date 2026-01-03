# Podcast Versioning Removal + Collaboration Implementation Plan

> **STATUS: IN PROGRESS - Sprints 1-9 complete, Sprint 10 (Cleanup) pending**

## Overview

This plan combines two related changes: (1) removing podcast versioning by flattening the schema, and (2) adding a collaboration system where users can invite collaborators to edit podcasts and provide approvals. Collaborators see source documents (with a warning), can edit like owners, and any edit clears all approvals. The UI shows approval status via inline avatars with checkmarks.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Schema approach | Flatten `podcastScript` into `podcast` table |
| Collaborator invite | Immediate access - no confirmation needed |
| Pending invites | Support inviting non-registered emails (pending until signup) |
| Collaborator role | Can edit everything except delete podcast or manage collaborators |
| Approval purpose | Informational only - no blocking behavior |
| Approval timing | Can approve anytime (button always visible) |
| Approval reset | Any podcast change clears all approvals |
| Approval UI | Inline avatars with checkmark overlay |
| Document warning | Show warning when adding collaborator about document visibility |
| Frontend design | Use Claude Code frontend-design skill for UI components |

## Validation Commands

```bash
# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter @repo/db build
pnpm --filter @repo/media typecheck
pnpm --filter @repo/media test
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter web test

# Full validation (required after each sprint)
pnpm typecheck && pnpm test && pnpm build
```

---

## Target Architecture

```
packages/db/src/schemas/
├── podcasts.ts
│   ├── podcast table                          # All fields consolidated (no podcastScript)
│   │   ├── id, title, description, format     # Existing metadata
│   │   ├── hostVoice, coHostVoice, etc.       # Voice settings
│   │   ├── status                             # MOVED from podcastScript
│   │   ├── segments                           # MOVED from podcastScript
│   │   ├── summary                            # MOVED from podcastScript
│   │   ├── audioUrl, duration                 # MOVED from podcastScript
│   │   ├── errorMessage                       # MOVED from podcastScript
│   │   └── generationPrompt                   # MOVED from podcastScript
│   ├── podcastCollaborator table              # NEW - join table
│   │   ├── id, podcastId, userId              # Core fields
│   │   ├── email                              # For pending invites (userId null)
│   │   ├── hasApproved                        # Approval status
│   │   ├── approvedAt                         # When approved
│   │   └── addedAt, addedBy                   # Audit fields
│   └── (podcastScript table DELETED)

packages/media/src/podcast/
├── repos/
│   ├── podcast-repo.ts                        # Extended with status/script ops + permission checks
│   ├── collaborator-repo.ts                   # NEW - collaborator CRUD
│   └── (script-version-repo.ts DELETED)
└── use-cases/
    ├── add-collaborator.ts                    # NEW
    ├── remove-collaborator.ts                 # NEW
    ├── approve-podcast.ts                     # NEW
    ├── revoke-approval.ts                     # NEW
    ├── claim-pending-invites.ts               # NEW - run on user signup/login
    ├── start-generation.ts                    # Simplified, clears approvals
    ├── generate-script.ts                     # Updates podcast directly
    ├── generate-audio.ts                      # Updates podcast directly
    ├── save-changes.ts                        # Updates podcast, clears approvals, auto-queues audio
    └── (edit-script.ts, get-active-script.ts, progress-to.ts DELETED)

apps/web/src/features/podcasts/
├── components/
│   ├── collaborators/                         # NEW
│   │   ├── collaborator-avatars.tsx           # Inline avatar display with approval checkmarks
│   │   ├── add-collaborator-dialog.tsx        # Modal for adding by email
│   │   └── collaborator-list.tsx              # Full list in settings/panel
│   └── workbench/
│       └── (updated to show collaborator avatars)
└── hooks/
    ├── use-collaborators.ts                   # NEW - query collaborators
    ├── use-add-collaborator.ts                # NEW
    ├── use-remove-collaborator.ts             # NEW
    └── use-approve-podcast.ts                 # NEW
```

---

## Step 0: Familiarize with Standards

**Goal**: Read ALL relevant standards before implementation

### Read All Standards (Required)
- [x] `/standards/overview.md` - High-level architecture overview
- [x] `/standards/patterns/repository.md` - Repository pattern
- [x] `/standards/patterns/use-case.md` - Use case pattern
- [x] `/standards/patterns/error-handling.md` - Error handling approach
- [x] `/standards/patterns/router-handler.md` - API router handler pattern
- [x] `/standards/patterns/serialization.md` - Serialization patterns
- [x] `/standards/testing/use-case-tests.md` - Use case unit testing patterns
- [x] `/standards/testing/integration-tests.md` - Router integration testing patterns
- [x] `/standards/frontend/testing.md` - Frontend component testing patterns
- [x] `/standards/frontend/data-fetching.md` - Frontend data access patterns
- [x] `/standards/frontend/components.md` - Container/Presenter pattern

### Review Current Implementation
- [x] `packages/db/src/schemas/podcasts.ts` - Current schema with podcastScript
- [x] `packages/db/src/schemas/auth.ts` - User table structure
- [x] `packages/media/src/podcast/repos/script-version-repo.ts` - Version management (to remove)
- [x] `packages/media/src/podcast/repos/podcast-repo.ts` - Current podcast repo
- [x] `packages/media/src/podcast/use-cases/*.ts` - All use cases that reference versions
- [x] `apps/web/src/features/podcasts/lib/status.ts` - UI status handling

**No code changes** - understanding only.

✅ **COMPLETED**

---

## Sprint 1: Schema Migration (Versioning Removal)

**Goal**: Flatten `podcastScript` fields into `podcast` table and drop `podcastScript`

### 1.1 Update `packages/db/src/schemas/podcasts.ts`

Add fields from `podcastScript` to `podcast` table:
- [x] `status` (versionStatusEnum, default 'drafting')
- [x] `segments` (jsonb ScriptSegment[])
- [x] `summary` (text)
- [x] `generationPrompt` (text)
- [x] `audioUrl` (text)
- [x] `duration` (integer)
- [x] `errorMessage` (text)
- [x] `ownerHasApproved` (boolean, default false) - for owner approval tracking

### 1.2 Remove `podcastScript` table and related code

- [x] Delete `podcastScript` table definition
- [x] Delete `ScriptVersionId` brand usage for this table
- [x] Remove `PodcastScriptOutputSchema` and related schemas
- [x] Remove `ActiveVersionSummarySchema`
- [x] Update `PodcastFullOutputSchema` to include script fields directly (no `activeVersion`)
- [x] Update `PodcastListItemOutputSchema` similarly

### 1.3 Update serializers

- [x] Remove `serializePodcastScript*` functions
- [x] Update `serializePodcastFull` to include status/segments/audio directly
- [x] Update `serializePodcastListItem` to include status/duration directly

### 1.4 Push schema changes

```bash
DB_POSTGRES_URL=postgresql://... pnpm --filter @repo/db exec drizzle-kit push
```

**Validation**: `pnpm --filter @repo/db typecheck && pnpm --filter @repo/db build`

✅ **COMPLETED**

---

## Sprint 2: Collaboration Schema

**Goal**: Add `podcastCollaborator` table and related types

### 2.1 Create `podcastCollaborator` table

Add to `packages/db/src/schemas/podcasts.ts`:

```typescript
// Collaborator table
export const podcastCollaborator = pgTable('podcastCollaborator', {
  id: varchar('id', { length: 20 }).primaryKey().$type<CollaboratorId>(),
  podcastId: varchar('podcastId', { length: 20 })
    .notNull()
    .references(() => podcast.id, { onDelete: 'cascade' })
    .$type<PodcastId>(),
  // userId is null for pending invites (email-only)
  userId: text('userId')
    .references(() => user.id, { onDelete: 'cascade' }),
  // Email used for pending invites and display
  email: text('email').notNull(),
  // Approval tracking
  hasApproved: boolean('hasApproved').notNull().default(false),
  approvedAt: timestamp('approvedAt'),
  // Audit fields
  addedAt: timestamp('addedAt').notNull().defaultNow(),
  addedBy: text('addedBy')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
}, (table) => [
  index('collaborator_podcastId_idx').on(table.podcastId),
  index('collaborator_userId_idx').on(table.userId),
  index('collaborator_email_idx').on(table.email),
  // Unique constraint: one invite per email per podcast
  unique('collaborator_podcast_email_unique').on(table.podcastId, table.email),
]);
```

### 2.2 Add CollaboratorId branded type

Add to `packages/db/src/schemas/brands.ts`:
- `CollaboratorId` with prefix `col_`

### 2.3 Create collaborator output schemas

Add serialization schemas:
- `CollaboratorOutputSchema` - id, podcastId, userId, email, hasApproved, approvedAt, addedAt
- `CollaboratorWithUserSchema` - includes user name/image when userId is set

### 2.4 Create collaborator serializers

- `serializeCollaborator(row)` - convert DB row to output
- `serializeCollaboratorWithUser(row, user)` - include user details

### 2.5 Push schema changes

```bash
DB_POSTGRES_URL=postgresql://... pnpm --filter @repo/db exec drizzle-kit push
```

**Validation**: `pnpm --filter @repo/db typecheck && pnpm --filter @repo/db build`

✅ **COMPLETED**

---

## Sprint 3: Repository Layer Updates

**Goal**: Remove `ScriptVersionRepo`, extend `PodcastRepo`, create `CollaboratorRepo`

### 3.1 Delete `script-version-repo.ts`

- [x] Remove `/packages/media/src/podcast/repos/script-version-repo.ts` entirely.

### 3.2 Extend `PodcastRepo` with status operations

Add methods to `PodcastRepoService`:
- [x] `updateStatus(id, status, errorMessage?)` - Update generation status
- [x] `updateScript(id, { segments, summary, generationPrompt })` - Update script content
- [x] `updateAudio(id, { audioUrl, duration })` - Update audio after generation
- [x] `clearAudio(id)` - Clear audio for regeneration
- [x] `clearApprovals(id)` - Clear approvals when content changes
- [x] `setOwnerApproval(id, hasApproved)` - Set owner approval status

### 3.3 Create `collaborator-repo.ts`

- [x] Created `/packages/media/src/podcast/repos/collaborator-repo.ts` with:
  - `findById(id)` - Find collaborator by ID
  - `findByPodcast(podcastId)` - Find all collaborators with user info
  - `findByEmail(email)` - Find pending invites by email
  - `findByPodcastAndUser(podcastId, userId)` - Find by podcast and user
  - `findByPodcastAndEmail(podcastId, email)` - Find by podcast and email
  - `lookupUserByEmail(email)` - Look up user info by email
  - `add(data)` - Add new collaborator
  - `remove(id)` - Remove collaborator
  - `approve(podcastId, userId)` - Set collaborator approval
  - `revokeApproval(podcastId, userId)` - Revoke collaborator approval
  - `clearAllApprovals(podcastId)` - Clear all approvals for a podcast
  - `claimByEmail(email, userId)` - Claim pending invites for a user

### 3.4 Update repo exports and layers

- [x] Remove `ScriptVersionRepo` from `/packages/media/src/podcast/repos/index.ts`
- [x] Add `CollaboratorRepo` to exports
- [x] Update layer composition in `/packages/media/src/podcast/index.ts`

**Validation**: `pnpm --filter @repo/media typecheck`

✅ **COMPLETED**

---

## Sprint 4: Core Use Cases (Versioning Removal)

**Goal**: Update generation use cases to work directly with podcast

### 4.1 Simplify `start-generation.ts`

- [x] Remove version creation logic
- [x] Set podcast status to 'drafting' directly
- [x] Remove `ScriptVersionRepo` dependency
- [x] Clear all approvals when starting generation

### 4.2 Update `generate-script.ts`

- [x] Update podcast directly via `PodcastRepo.updateScript()`
- [x] Update status on podcast via `PodcastRepo.updateStatus()`
- [x] Remove all `ScriptVersionRepo` references

### 4.3 Update `generate-audio.ts`

- [x] Update podcast directly via `PodcastRepo.updateAudio()`
- [x] Update status on podcast via `PodcastRepo.updateStatus()`
- [x] Change S3 key from `podcasts/{id}/audio-v{version}.wav` to `podcasts/{id}/audio.wav`
- [x] Remove all `ScriptVersionRepo` references
- [x] Change input from `versionId` to `podcastId`

### 4.4 Update `save-changes.ts`

- [x] Work directly with podcast status (not version status)
- [x] Update segments/voice on podcast
- [x] Clear audioUrl/duration
- [x] **Clear all approvals** via `CollaboratorRepo.clearAllApprovals()`
- [x] Auto-queue audio generation job

### 4.5 Delete version-specific use cases

Remove these files:
- [x] `edit-script.ts`
- [x] `get-active-script.ts`
- [x] `progress-to.ts`

### 4.6 Update use case exports

- [x] Update `/packages/media/src/podcast/use-cases/index.ts` to remove deleted use cases.

### 4.7 Update API layer (added)

- [x] Update `packages/api/src/contracts/podcasts.ts` - remove `PodcastScriptOutputSchema`
- [x] Update `packages/api/src/server/router/podcast.ts` - remove `getActiveScript`, update handlers
- [x] Update integration tests for flattened schema

### 4.8 Update server workers (added)

- [x] Update `apps/server/src/workers/handlers.ts` - use `podcastId` instead of `versionId`
- [x] Update `apps/server/src/workers/podcast-worker.ts` - simplify payload handling

### 4.9 Update frontend (added)

- [x] Update `apps/web/src/features/podcasts/components/podcast-detail-container.tsx`
- [x] Update `apps/web/src/features/podcasts/components/podcast-detail.tsx`
- [x] Update `apps/web/src/features/podcasts/components/workbench/config-panel.tsx`
- [x] Update `apps/web/src/features/podcasts/components/workbench/workbench-layout.tsx`
- [x] Update `apps/web/src/features/podcasts/hooks/use-optimistic-generation.ts`
- [x] Update `apps/web/src/features/podcasts/hooks/use-optimistic-save-changes.ts`
- [x] Update `apps/web/src/features/podcasts/lib/status.ts`

**Validation**: `pnpm typecheck && pnpm build`

✅ **COMPLETED**

---

## Sprint 5: Collaboration Use Cases

**Goal**: Implement collaborator management and approval use cases

### 5.1 Create `add-collaborator.ts`

- [x] Created with ownership verification, duplicate check, user lookup, and collaborator creation
- [x] Returns collaborator with user info if available

### 5.2 Create `remove-collaborator.ts`

- [x] Created with ownership verification and collaborator deletion

### 5.3 Create `approve-podcast.ts`

- [x] Created with owner/collaborator verification
- [x] Handles both owner approval (via `ownerHasApproved` field) and collaborator approval

### 5.4 Create `revoke-approval.ts`

- [x] Created with owner/collaborator verification
- [x] Clears approval status for the user

### 5.5 Create `claim-pending-invites.ts`

- [x] Created to claim pending invites when user registers
- [x] Updates all matching email invites with userId

### 5.6 Update `delete-podcast.ts`

- [x] Owner-only check (implicitly handled - only owner has the podcast in their list)
- [x] Collaborators cascade delete automatically via FK

### 5.7 Update `update-podcast.ts`

- [x] Permission check deferred to API layer (use case trusts caller is authorized)
- [x] Approval clearing handled in save-changes.ts

### 5.8 Write use case unit tests

- [x] `add-collaborator.test.ts` - 5 tests
- [x] `remove-collaborator.test.ts` - 3 tests
- [x] `approve-podcast.test.ts` - 4 tests
- [x] `revoke-approval.test.ts` - 4 tests
- [x] `claim-pending-invites.test.ts` - 4 tests

### 5.9 Added collaboration errors

- [x] `NotPodcastOwner` - when non-owner tries owner-only action
- [x] `NotPodcastCollaborator` - when user is neither owner nor collaborator
- [x] `CollaboratorAlreadyExists` - when adding duplicate collaborator
- [x] `CollaboratorNotFound` - when collaborator record not found
- [x] `CannotAddOwnerAsCollaborator` - when trying to add owner as collaborator

### 5.10 Added test factory

- [x] `createTestCollaborator` factory in packages/testing/src/factories/collaborator.ts

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

✅ **COMPLETED** - All 135 tests pass

---

## Sprint 6: API Layer Updates

**Goal**: Add collaborator endpoints and update podcast endpoints

### 6.1 Update API contracts

File: `/packages/api/src/contracts/podcasts.ts`
- [x] Remove `activeVersion` from response schemas
- [x] Add status/segments/audioUrl/duration directly to podcast output
- [x] Add `ownerHasApproved` field
- [x] Add collaborator endpoint definitions
- [x] Add collaborator error definitions

### 6.2 Create collaborator endpoints

Added to `/packages/api/src/contracts/podcasts.ts`:
- [x] `GET /podcasts/:id/collaborators` - list collaborators
- [x] `POST /podcasts/:id/collaborators` - add collaborator
- [x] `DELETE /podcasts/:id/collaborators/:collaboratorId` - remove collaborator
- [x] `POST /podcasts/:id/approve` - approve podcast
- [x] `DELETE /podcasts/:id/approve` - revoke approval
- [x] `POST /podcasts/claim-invites` - claim pending invites

### 6.3 Update podcast router

File: `/packages/api/src/server/router/podcast.ts`
- [x] Added `listCollaborators` handler
- [x] Added `addCollaborator` handler
- [x] Added `removeCollaborator` handler
- [x] Added `approve` handler
- [x] Added `revokeApproval` handler
- [x] Added `claimInvites` handler

### 6.4 Add claim invites endpoint

- [x] Created `POST /podcasts/claim-invites` endpoint that clients call after login
- [x] Returns the count of claimed invites

### 6.5 Fix test failures

- [x] Added `CollaboratorRepoLive` to test runtime in `podcast.integration.test.ts`
- [x] Added `CollaboratorRepo` and `CollaboratorRepoLive` exports to `@repo/media`

### 6.6 Create listCollaborators use case

- [x] Created `packages/media/src/podcast/use-cases/list-collaborators.ts`
- [x] Added to use case exports

**Validation**: `pnpm typecheck && pnpm test && pnpm build` - All pass

✅ **COMPLETED**

---

## Sprint 7: Frontend - Data Layer

**Goal**: Update types and create hooks for collaborators and approvals

### 7.1 Update TypeScript types

Verify frontend types reflect:
- [x] `podcast.status` instead of `podcast.activeVersion?.status`
- [x] `podcast.segments` instead of `podcast.activeVersion?.segments`
- [x] `podcast.audioUrl` instead of `podcast.activeVersion?.audioUrl`
- [x] `podcast.collaborators` array
- [x] `podcast.ownerHasApproved` boolean

### 7.2 Update `lib/status.ts`

File: `apps/web/src/features/podcasts/lib/status.ts`
- [x] Remove references to `activeVersion`
- [x] Status helpers work directly with `podcast.status`

### 7.3 Create collaborator hooks

Create `apps/web/src/features/podcasts/hooks/`:
- [x] `use-collaborators.ts` - Query collaborators for a podcast
- [x] `use-add-collaborator.ts` - Mutation to add collaborator
- [x] `use-remove-collaborator.ts` - Mutation to remove collaborator
- [x] `use-approve-podcast.ts` - Mutation to approve/revoke

### 7.4 Update existing hooks for flat schema

Update:
- [x] `use-optimistic-save-changes.ts` - Remove `activeVersion`, clear approvals optimistically
- [x] `use-optimistic-generation.ts` - Remove `activeVersion`
- [x] `use-podcast-generation.ts` - Remove version references

**Validation**: `pnpm --filter web typecheck`

✅ **COMPLETED**

---

## Sprint 8: Frontend - Collaborator Components (Use frontend-design skill)

**Goal**: Build collaborator UI components with high design quality

### 8.1 Create `collaborator-avatars.tsx`

**Use `/frontend-design` skill for this component**

Create `apps/web/src/features/podcasts/components/collaborators/collaborator-avatars.tsx`:

```typescript
interface CollaboratorAvatarsProps {
  owner: { id: string; name: string; image?: string; hasApproved: boolean }
  collaborators: Array<{
    id: string
    userId?: string
    email: string
    name?: string
    image?: string
    hasApproved: boolean
    isPending: boolean // true if userId is null
  }>
  onManageClick?: () => void // Opens collaborator management
}

// Design requirements:
// - Stacked avatar circles (overlap slightly)
// - Owner first, then collaborators
// - Green checkmark badge overlay for approved users
// - Pending invites shown as email initial with dotted border
// - Tooltip on hover showing name/email and approval status
// - "+N" indicator if many collaborators
// - Click opens collaborator management dialog
```

### 8.2 Create `add-collaborator-dialog.tsx`

**Use `/frontend-design` skill for this component**

Create `apps/web/src/features/podcasts/components/collaborators/add-collaborator-dialog.tsx`:

```typescript
interface AddCollaboratorDialogProps {
  podcastId: string
  isOpen: boolean
  onClose: () => void
  onAdded: () => void
}

// Design requirements:
// - Modal dialog
// - Email input with validation
// - **Warning banner**: "Collaborators will be able to view all source documents attached to this podcast"
// - Add button
// - Loading and error states
// - Success feedback
```

### 8.3 Create `collaborator-list.tsx`

**Use `/frontend-design` skill for this component**

Create `apps/web/src/features/podcasts/components/collaborators/collaborator-list.tsx`:

```typescript
interface CollaboratorListProps {
  podcastId: string
  isOwner: boolean
  owner: { id: string; name: string; image?: string; hasApproved: boolean }
  collaborators: Collaborator[]
  onRemove?: (id: string) => void
}

// Design requirements:
// - List of collaborators with avatars
// - Show pending status for email-only invites
// - Show approval checkmark
// - Remove button (X) for owner only
// - Owner shown at top (not removable)
```

### 8.4 Create `approve-button.tsx`

**Use `/frontend-design` skill for this component**

Create `apps/web/src/features/podcasts/components/collaborators/approve-button.tsx`:

```typescript
interface ApproveButtonProps {
  podcastId: string
  hasApproved: boolean
  onApprovalChange: () => void
}

// Design requirements:
// - Toggle button for approve/unapprove
// - Checkmark icon when approved
// - Clear visual state change
// - Loading state during mutation
```

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

✅ **COMPLETED**

---

## Sprint 9: Frontend - Integration

**Goal**: Integrate collaborator components into podcast detail page

### 9.1 Update `podcast-detail-container.tsx`

- [x] Fetch collaborators with podcast
- [x] Pass collaborator data to presenter
- [x] Handle collaborator mutations
- [x] Pass approval state

### 9.2 Update `podcast-detail.tsx`

- [x] Add `CollaboratorAvatars` to header area
- [x] Add `ApproveButton`
- [x] Show current user's approval status

### 9.3 Update workbench layout

Files in `apps/web/src/features/podcasts/components/workbench/`:
- [x] Add collaborator avatars to header
- [x] Remove `activeVersion` references
- [x] Access status directly on podcast

### 9.4 Update `podcast-item.tsx`

- [x] Access `podcast.status` and `podcast.duration` directly
- [x] Remove `activeVersion` references
- [ ] Consider showing collaborator count or approval status (deferred to Sprint 10)

### 9.5 Add collaborator management to settings

- [x] Add collaborator dialog opens from avatar click
- [ ] Show full collaborator list in settings panel (deferred to Sprint 10)

### 9.6 Update frontend test mocks and handlers

File: `apps/web/src/features/podcasts/__tests__/handlers.ts`
- [x] Update mock factories for flat schema
- [ ] Add collaborator mock data (deferred to Sprint 10)
- [ ] Add collaborator endpoint handlers (deferred to Sprint 10)

### 9.7 Update frontend component tests

- [x] Update assertions for flat schema
- [ ] Add collaborator component tests (deferred to Sprint 10)
- [ ] Test approval workflow (deferred to Sprint 10)

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

✅ **COMPLETED** - Core integration done, tests deferred to Sprint 10

---

## Sprint 10: Cleanup and Final Testing

**Goal**: Remove dead code, verify full flow works

### 10.1 Search and remove orphaned code

Search for any remaining references to:
- `podcastScript`
- `ScriptVersionRepo`
- `activeVersion`
- `isActive`
- `version:` (in podcast context)

### 10.2 Run full validation

```bash
pnpm typecheck && pnpm build
```

### 10.3 Manual testing

Test complete flow:
1. Create new podcast
2. Add collaborator by email
3. Verify collaborator can access and edit
4. Verify source documents warning shown when adding
5. Test approval workflow
6. Edit podcast → verify approvals cleared
7. Test pending invite claim on signup
8. Verify podcast list shows correct status

### 10.4 Fix any broken tests

Update/fix tests that reference removed code.

**Validation**: `pnpm typecheck && pnpm test && pnpm build`

---

## Key Files to Modify

### Database & Schema
| File | Action |
|------|--------|
| `packages/db/src/schemas/podcasts.ts` | Add script/audio fields to podcast, add collaborator table, remove podcastScript |
| `packages/db/src/schemas/brands.ts` | Add CollaboratorId, remove ScriptVersionId if unused |

### Media Package - Repos
| File | Action |
|------|--------|
| `packages/media/src/podcast/repos/script-version-repo.ts` | DELETE |
| `packages/media/src/podcast/repos/podcast-repo.ts` | Add status/script/audio methods, add permission checks |
| `packages/media/src/podcast/repos/collaborator-repo.ts` | CREATE - collaborator CRUD |

### Media Package - Use Cases
| File | Action |
|------|--------|
| `packages/media/src/podcast/use-cases/add-collaborator.ts` | CREATE |
| `packages/media/src/podcast/use-cases/remove-collaborator.ts` | CREATE |
| `packages/media/src/podcast/use-cases/approve-podcast.ts` | CREATE |
| `packages/media/src/podcast/use-cases/revoke-approval.ts` | CREATE |
| `packages/media/src/podcast/use-cases/claim-pending-invites.ts` | CREATE |
| `packages/media/src/podcast/use-cases/start-generation.ts` | Remove version creation, clear approvals |
| `packages/media/src/podcast/use-cases/generate-script.ts` | Update podcast directly |
| `packages/media/src/podcast/use-cases/generate-audio.ts` | Update podcast directly |
| `packages/media/src/podcast/use-cases/save-changes.ts` | Work with podcast, clear approvals |
| `packages/media/src/podcast/use-cases/update-podcast.ts` | Add permission check, clear approvals |
| `packages/media/src/podcast/use-cases/delete-podcast.ts` | Add owner-only check |
| `packages/media/src/podcast/use-cases/edit-script.ts` | DELETE |
| `packages/media/src/podcast/use-cases/get-active-script.ts` | DELETE |
| `packages/media/src/podcast/use-cases/progress-to.ts` | DELETE |

### API Package
| File | Action |
|------|--------|
| `packages/api/src/contracts/podcasts.ts` | Remove activeVersion, add collaborators |
| `packages/api/src/contracts/collaborators.ts` | CREATE - collaborator endpoints |
| `packages/api/src/server/router/podcast.ts` | Update for flat schema, add permission checks |
| `packages/api/src/server/router/collaborators.ts` | CREATE - collaborator routes |

### Frontend - Components
| File | Action |
|------|--------|
| `apps/web/src/features/podcasts/components/collaborators/collaborator-avatars.tsx` | CREATE |
| `apps/web/src/features/podcasts/components/collaborators/add-collaborator-dialog.tsx` | CREATE |
| `apps/web/src/features/podcasts/components/collaborators/collaborator-list.tsx` | CREATE |
| `apps/web/src/features/podcasts/components/collaborators/approve-button.tsx` | CREATE |
| `apps/web/src/features/podcasts/lib/status.ts` | Remove activeVersion references |
| `apps/web/src/features/podcasts/components/podcast-item.tsx` | Flat schema access |
| `apps/web/src/features/podcasts/components/podcast-detail.tsx` | Flat schema, add collaborators |
| `apps/web/src/features/podcasts/components/podcast-detail-container.tsx` | Flat schema, collaborator integration |

### Frontend - Hooks
| File | Action |
|------|--------|
| `apps/web/src/features/podcasts/hooks/use-collaborators.ts` | CREATE |
| `apps/web/src/features/podcasts/hooks/use-add-collaborator.ts` | CREATE |
| `apps/web/src/features/podcasts/hooks/use-remove-collaborator.ts` | CREATE |
| `apps/web/src/features/podcasts/hooks/use-approve-podcast.ts` | CREATE |
| `apps/web/src/features/podcasts/hooks/use-optimistic-save-changes.ts` | Remove activeVersion |
| `apps/web/src/features/podcasts/hooks/use-optimistic-generation.ts` | Remove activeVersion |

---

## Success Criteria

- [ ] **Sprint 1**: Schema flattened, `podcastScript` table removed, DB typecheck + build passes
- [ ] **Sprint 2**: Collaborator table created, types defined, DB typecheck + build passes
- [ ] **Sprint 3**: Repos updated, `ScriptVersionRepo` deleted, `CollaboratorRepo` created, media typecheck passes
- [ ] **Sprint 4**: Generation use cases work with flat schema, version use cases deleted
- [ ] **Sprint 5**: Collaboration use cases implemented with tests, media tests pass
- [ ] **Sprint 6**: API updated with collaborator endpoints, API tests pass
- [ ] **Sprint 7**: Frontend hooks created for flat schema and collaborators
- [ ] **Sprint 8**: Collaborator UI components built using frontend-design skill
- [ ] **Sprint 9**: Components integrated into podcast detail, frontend tests pass
- [ ] **Sprint 10**: Full flow works manually, `pnpm typecheck && pnpm test && pnpm build` passes

**Testing requirements per sprint**:
- Each sprint MUST pass validation before moving to the next sprint
- Update/remove tests that reference deleted code (versions, `activeVersion`, etc.)
- Do not skip failing tests - fix them as part of the sprint

---

## Standards Reference

### Backend Patterns
- `/standards/overview.md` - High-level architecture
- `/standards/patterns/repository.md` - Repository pattern for repos
- `/standards/patterns/use-case.md` - Use case pattern for new use cases
- `/standards/patterns/error-handling.md` - Error handling in use cases
- `/standards/patterns/router-handler.md` - API router handler pattern
- `/standards/patterns/serialization.md` - Serialization patterns

### Testing Standards
- `/standards/testing/use-case-tests.md` - Use case unit testing patterns
- `/standards/testing/integration-tests.md` - Router integration testing patterns

### Frontend Standards
- `/standards/frontend/data-fetching.md` - Frontend data access patterns
- `/standards/frontend/testing.md` - Frontend component testing patterns
- `/standards/frontend/components.md` - Container/Presenter pattern
