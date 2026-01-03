# Podcast Versioning Removal + Collaboration Implementation Plan

> **STATUS: NOT STARTED**

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
- [ ] `/standards/overview.md` - High-level architecture overview
- [ ] `/standards/patterns/repository.md` - Repository pattern
- [ ] `/standards/patterns/use-case.md` - Use case pattern
- [ ] `/standards/patterns/error-handling.md` - Error handling approach
- [ ] `/standards/patterns/router-handler.md` - API router handler pattern
- [ ] `/standards/patterns/serialization.md` - Serialization patterns
- [ ] `/standards/testing/use-case-tests.md` - Use case unit testing patterns
- [ ] `/standards/testing/integration-tests.md` - Router integration testing patterns
- [ ] `/standards/frontend/testing.md` - Frontend component testing patterns
- [ ] `/standards/frontend/data-fetching.md` - Frontend data access patterns
- [ ] `/standards/frontend/components.md` - Container/Presenter pattern

### Review Current Implementation
- [ ] `packages/db/src/schemas/podcasts.ts` - Current schema with podcastScript
- [ ] `packages/db/src/schemas/auth.ts` - User table structure
- [ ] `packages/media/src/podcast/repos/script-version-repo.ts` - Version management (to remove)
- [ ] `packages/media/src/podcast/repos/podcast-repo.ts` - Current podcast repo
- [ ] `packages/media/src/podcast/use-cases/*.ts` - All use cases that reference versions
- [ ] `apps/web/src/features/podcasts/lib/status.ts` - UI status handling

**No code changes** - understanding only.

---

## Sprint 1: Schema Migration (Versioning Removal)

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

**Validation**: `pnpm --filter @repo/db typecheck && pnpm --filter @repo/db build`

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

---

## Sprint 3: Repository Layer Updates

**Goal**: Remove `ScriptVersionRepo`, extend `PodcastRepo`, create `CollaboratorRepo`

### 3.1 Delete `script-version-repo.ts`

Remove `/packages/media/src/podcast/repos/script-version-repo.ts` entirely.

### 3.2 Extend `PodcastRepo` with status operations

Add methods to `PodcastRepoService`:
- `updateStatus(id, status, errorMessage?)` - Update generation status
- `updateScript(id, { segments, summary, generationPrompt })` - Update script content
- `updateAudio(id, { audioUrl, duration })` - Update audio after generation
- `clearAudio(id)` - Clear audio for regeneration
- `canUserAccess(podcastId, userId)` - Check if user is owner or collaborator
- `canUserEdit(podcastId, userId)` - Check if user can edit (owner or collaborator)

### 3.3 Create `collaborator-repo.ts`

New file `/packages/media/src/podcast/repos/collaborator-repo.ts`:

```typescript
interface CollaboratorRepoService {
  // Query
  findByPodcast(podcastId: PodcastId): Effect<CollaboratorWithUser[]>
  findByEmail(email: string): Effect<Collaborator[]> // For claiming pending

  // Commands
  add(data: { podcastId, email, addedBy }): Effect<Collaborator>
  remove(id: CollaboratorId): Effect<void>

  // Approval
  approve(podcastId: PodcastId, userId: UserId): Effect<void>
  revokeApproval(podcastId: PodcastId, userId: UserId): Effect<void>
  clearAllApprovals(podcastId: PodcastId): Effect<void>

  // Pending invite claims
  claimByEmail(email: string, userId: UserId): Effect<number> // Returns count claimed
}
```

### 3.4 Update repo exports and layers

- Remove `ScriptVersionRepo` from `/packages/media/src/podcast/repos/index.ts`
- Add `CollaboratorRepo` to exports
- Update layer composition in `/packages/media/src/podcast/index.ts`

**Validation**: `pnpm --filter @repo/media typecheck`

---

## Sprint 4: Core Use Cases (Versioning Removal)

**Goal**: Update generation use cases to work directly with podcast

### 4.1 Simplify `start-generation.ts`

- Remove version creation logic
- Set podcast status to 'drafting' directly
- Remove `ScriptVersionRepo` dependency
- Clear all approvals when starting generation

### 4.2 Update `generate-script.ts`

- Update podcast directly via `PodcastRepo.updateScript()`
- Update status on podcast via `PodcastRepo.updateStatus()`
- Remove all `ScriptVersionRepo` references

### 4.3 Update `generate-audio.ts`

- Update podcast directly via `PodcastRepo.updateAudio()`
- Update status on podcast via `PodcastRepo.updateStatus()`
- Change S3 key from `podcasts/{id}/audio-v{version}.wav` to `podcasts/{id}/audio.wav`
- Remove all `ScriptVersionRepo` references

### 4.4 Update `save-changes.ts`

- Work directly with podcast status (not version status)
- Update segments/voice on podcast
- Clear audioUrl/duration
- **Clear all approvals** via `CollaboratorRepo.clearAllApprovals()`
- Auto-queue audio generation job
- Add permission check: user must be owner or collaborator

### 4.5 Delete version-specific use cases

Remove these files:
- `edit-script.ts`
- `get-active-script.ts`
- `progress-to.ts`

### 4.6 Update use case exports

Update `/packages/media/src/podcast/use-cases/index.ts` to remove deleted use cases.

**Validation**: `pnpm --filter @repo/media typecheck`

---

## Sprint 5: Collaboration Use Cases

**Goal**: Implement collaborator management and approval use cases

### 5.1 Create `add-collaborator.ts`

```typescript
interface AddCollaboratorInput {
  podcastId: PodcastId
  email: string
  addedBy: UserId // Must be podcast owner
}

// Behavior:
// 1. Verify addedBy is the podcast owner
// 2. Check if email is already a collaborator
// 3. Look up user by email - if exists, set userId
// 4. Create collaborator record
// 5. Return collaborator with user info if available
```

### 5.2 Create `remove-collaborator.ts`

```typescript
interface RemoveCollaboratorInput {
  collaboratorId: CollaboratorId
  removedBy: UserId // Must be podcast owner
}

// Behavior:
// 1. Verify removedBy is the podcast owner
// 2. Delete collaborator record
```

### 5.3 Create `approve-podcast.ts`

```typescript
interface ApprovePodcastInput {
  podcastId: PodcastId
  userId: UserId // Must be owner or collaborator
}

// Behavior:
// 1. Verify user is owner or collaborator
// 2. Set hasApproved=true, approvedAt=now for this user
// 3. If user is owner, need to track owner approval separately
//    (add `ownerHasApproved` field to podcast table)
```

### 5.4 Create `revoke-approval.ts`

```typescript
interface RevokeApprovalInput {
  podcastId: PodcastId
  userId: UserId
}

// Behavior:
// 1. Verify user is owner or collaborator
// 2. Set hasApproved=false, approvedAt=null
```

### 5.5 Create `claim-pending-invites.ts`

```typescript
interface ClaimPendingInvitesInput {
  email: string
  userId: UserId
}

// Behavior:
// 1. Find all collaborator records with matching email and null userId
// 2. Update them to set userId
// 3. Return count of claimed invites
// Note: Call this on user login/signup
```

### 5.6 Update `delete-podcast.ts`

- Add permission check: only owner can delete
- Collaborators cascade delete automatically via FK

### 5.7 Update `update-podcast.ts`

- Add permission check: user must be owner or collaborator
- **Clear all approvals** when podcast is updated

### 5.8 Write use case unit tests

Create tests following `/standards/testing/use-case-tests.md`:
- `add-collaborator.test.ts`
- `remove-collaborator.test.ts`
- `approve-podcast.test.ts`
- `revoke-approval.test.ts`
- `claim-pending-invites.test.ts`

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 6: API Layer Updates

**Goal**: Add collaborator endpoints and update podcast endpoints

### 6.1 Update API contracts

File: `/packages/api/src/contracts/podcasts.ts`
- Remove `activeVersion` from response schemas
- Add status/segments/audioUrl/duration directly to podcast output
- Add `ownerHasApproved` field
- Add `collaborators` array to full podcast output

### 6.2 Create collaborator contract

File: `/packages/api/src/contracts/collaborators.ts`
```typescript
// Endpoints:
// GET /podcasts/:id/collaborators - list collaborators
// POST /podcasts/:id/collaborators - add collaborator
// DELETE /podcasts/:id/collaborators/:collaboratorId - remove collaborator
// POST /podcasts/:id/approve - approve podcast
// DELETE /podcasts/:id/approve - revoke approval
```

### 6.3 Update podcast router

File: `/packages/api/src/server/router/podcast.ts`
- Update `getById` to return podcast with script fields and collaborators
- Update `list` to include status/duration directly
- Add permission checks to mutations (owner or collaborator)
- Update `saveChanges` handler to clear approvals

### 6.4 Create collaborator routes

Either add to podcast router or create new router:
- `listCollaborators` - GET collaborators for podcast
- `addCollaborator` - POST add by email
- `removeCollaborator` - DELETE remove collaborator
- `approvePodcast` - POST approve
- `revokeApproval` - DELETE revoke

### 6.5 Add claim invites hook

Call `claimPendingInvites` use case on user login/session creation.
Location: Auth hooks or session middleware.

### 6.6 Update router integration tests

Update tests for flat schema and add collaborator tests:
- Test collaborator CRUD
- Test approval workflow
- Test permission checks
- Test approval clearing on changes

**Validation**: `pnpm --filter @repo/api typecheck && pnpm --filter @repo/api test`

---

## Sprint 7: Frontend - Data Layer

**Goal**: Update types and create hooks for collaborators and approvals

### 7.1 Update TypeScript types

Verify frontend types reflect:
- `podcast.status` instead of `podcast.activeVersion?.status`
- `podcast.segments` instead of `podcast.activeVersion?.segments`
- `podcast.audioUrl` instead of `podcast.activeVersion?.audioUrl`
- `podcast.collaborators` array
- `podcast.ownerHasApproved` boolean

### 7.2 Update `lib/status.ts`

File: `apps/web/src/features/podcasts/lib/status.ts`
- Remove references to `activeVersion`
- Status helpers work directly with `podcast.status`

### 7.3 Create collaborator hooks

Create `apps/web/src/features/podcasts/hooks/`:
- `use-collaborators.ts` - Query collaborators for a podcast
- `use-add-collaborator.ts` - Mutation to add collaborator
- `use-remove-collaborator.ts` - Mutation to remove collaborator
- `use-approve-podcast.ts` - Mutation to approve/revoke

### 7.4 Update existing hooks for flat schema

Update:
- `use-optimistic-save-changes.ts` - Remove `activeVersion`, clear approvals optimistically
- `use-optimistic-generation.ts` - Remove `activeVersion`
- `use-podcast-generation.ts` - Remove version references

**Validation**: `pnpm --filter web typecheck`

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

---

## Sprint 9: Frontend - Integration

**Goal**: Integrate collaborator components into podcast detail page

### 9.1 Update `podcast-detail-container.tsx`

- Fetch collaborators with podcast
- Pass collaborator data to presenter
- Handle collaborator mutations
- Pass approval state

### 9.2 Update `podcast-detail.tsx`

- Add `CollaboratorAvatars` to header area
- Add `ApproveButton`
- Show current user's approval status

### 9.3 Update workbench layout

Files in `apps/web/src/features/podcasts/components/workbench/`:
- Add collaborator avatars to header
- Remove `activeVersion` references
- Access status directly on podcast

### 9.4 Update `podcast-item.tsx`

- Access `podcast.status` and `podcast.duration` directly
- Remove `activeVersion` references
- Consider showing collaborator count or approval status

### 9.5 Add collaborator management to settings

Either in existing settings panel or new section:
- Show full collaborator list
- Add collaborator button (opens dialog)
- Remove collaborator functionality

### 9.6 Update frontend test mocks and handlers

File: `apps/web/src/features/podcasts/__tests__/handlers.ts`
- Update mock factories for flat schema
- Add collaborator mock data
- Add collaborator endpoint handlers

### 9.7 Update frontend component tests

- Update assertions for flat schema
- Add collaborator component tests
- Test approval workflow

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build && pnpm --filter web test`

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
