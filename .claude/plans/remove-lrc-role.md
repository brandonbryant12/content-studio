# Refactoring Plan: Simplify Collaboration System

## Overview

Remove the complex LRC (Legal/Risk/Compliance) reviewer role system and implement a simpler collaboration model where all collaborators can approve or reject podcasts.

## Current State Analysis

- **Main branch**: No collaboration system exists
- **Branch `t`**: Contains complex collaboration system (not merged):
  - Separate reviewer role from collaborators
  - Version-level approvals requiring reviewer sign-off
  - Comment/discussion system on script segments
  - Role hierarchy: owner/editor/viewer

- **Compiled dist files**: Exist from branch `t` build (will be overwritten)

## Proposed Design

### Simplified Model

1. **Single collaborator role**: All collaborators equal (no hierarchy)
2. **Podcast-level approval**: Track who approved/rejected the podcast (not per-version)
3. **No comments/discussions**: Feature removed entirely
4. **Creator + collaborators**: Creator implicitly has full access via `createdBy`

### Database Schema

```sql
-- podcast_collaborator: Track who has access to a podcast
CREATE TABLE podcast_collaborator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES podcast(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  added_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);

-- podcast_approval: Track who approved/rejected the podcast
CREATE TYPE approval_status AS ENUM ('approved', 'rejected');

CREATE TABLE podcast_approval (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES podcast(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status approval_status NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);
```

### Access Control Logic

- **Creator** (`podcast.createdBy`): Full access (edit, delete, approve, manage collaborators)
- **Collaborator**: Can view, edit script, approve/reject (cannot delete or manage collaborators)
- **Others**: No access

### Implementation Files

#### 1. Database Schema
- `packages/db/src/schemas/collaboration.ts` (NEW)
  - `podcastCollaborator` table
  - `podcastApproval` table
  - Serializers and output schemas

#### 2. Service Layer
- `packages/media/src/collaboration/` (NEW)
  - `repos/collaboration-repo.ts` - CRUD for collaborators
  - `repos/approval-repo.ts` - CRUD for approvals
  - `utils/access.ts` - Access checking utilities

#### 3. API Layer
- `packages/api/src/contracts/collaboration.ts` (NEW)
  - `listCollaborators` - Get all collaborators
  - `addCollaborator` - Add a user as collaborator
  - `removeCollaborator` - Remove collaborator
  - `getApprovals` - Get all approvals for podcast
  - `submitApproval` - Approve or reject
  - `withdrawApproval` - Remove own approval

#### 4. Export Updates
- `packages/db/src/index.ts` - Export collaboration schema
- `packages/media/src/index.ts` - Export collaboration module
- `packages/api/src/contracts/index.ts` - Export collaboration contract
- `packages/api/src/server/router/index.ts` - Register routes

### What's NOT Included (Explicitly Removed)

1. **LRC/Reviewer role**: No separate reviewer designation
2. **Role hierarchy**: No owner/editor/viewer roles for collaborators
3. **Comment system**: No comments on segments
4. **Version-level approvals**: Approvals are podcast-wide
5. **Invite system**: Direct add only (can be added later if needed)

## Implementation Steps

### Phase 1: Database Schema
1. Create `packages/db/src/schemas/collaboration.ts`
2. Define `podcastCollaborator` table
3. Define `approvalStatusEnum` and `podcastApproval` table
4. Create output schemas and serializers
5. Export from `packages/db/src/index.ts`

### Phase 2: Service Layer
1. Create `packages/media/src/collaboration/repos/collaboration-repo.ts`
2. Create `packages/media/src/collaboration/repos/approval-repo.ts`
3. Create `packages/media/src/collaboration/utils/access.ts`
4. Create index files and exports

### Phase 3: API Layer
1. Create `packages/api/src/contracts/collaboration.ts`
2. Create `packages/api/src/server/router/collaboration.ts`
3. Register in router index
4. Add error types to `packages/effect/src/errors.ts`

### Phase 4: Cleanup
1. Remove any dist files from complex collaboration (they'll be rebuilt)
2. Run typecheck
3. Run tests
4. Verify build

## Error Types

```typescript
// packages/effect/src/errors.ts
export class CollaboratorNotFound extends Schema.TaggedError<CollaboratorNotFound>()(
  'CollaboratorNotFound',
  { id: Schema.String }
) {}

export class AlreadyCollaborator extends Schema.TaggedError<AlreadyCollaborator>()(
  'AlreadyCollaborator',
  { userId: Schema.String, podcastId: Schema.String }
) {}

export class InsufficientAccess extends Schema.TaggedError<InsufficientAccess>()(
  'InsufficientAccess',
  {
    userId: Schema.String,
    podcastId: Schema.String,
    required: Schema.String
  }
) {}
```

## Testing Plan

1. Unit tests for repos using test context
2. Integration tests for access control
3. API contract validation

## Success Criteria

- [ ] All collaborators can view podcast
- [ ] All collaborators can edit script
- [ ] All collaborators can submit approval (approve/reject)
- [ ] Creator can manage collaborators
- [ ] Approval list shows who approved/rejected
- [ ] No reviewer role exists
- [ ] No comment system exists
- [ ] All tests pass
- [ ] Typecheck passes
