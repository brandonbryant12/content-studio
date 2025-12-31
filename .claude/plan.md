# Refactoring Plan: Simplify Podcast Status System

## Overview

Remove the "published/ready to publish" concept and simplify the podcast workflow to a single linear status flow. Users can only edit settings (voice, script) when a podcast is fully generated ("ready" state).

## Current vs New Status Flow

### Current Version Statuses
- `draft` - No script content yet
- `script_ready` - Has script, needs audio
- `generating_audio` - Audio generation in progress
- `audio_ready` - Complete with script and audio
- `failed` - Generation failed

### New Version Statuses
| Status | Description |
|--------|-------------|
| `drafting` | Initial state, no content yet |
| `generating_script` | LLM is generating the script |
| `script_ready` | Script generated, awaiting audio generation |
| `generating_audio` | TTS is generating audio |
| `ready` | Fully generated, can edit settings |
| `failed` | Generation failed |

### Key Behavior Changes

1. **Settings editing only in "ready" state** - Voice, script edits locked until audio is generated
2. **Single "Save" action** - When user edits script/voice in "ready" state, save updates the transcript and regenerates audio automatically
3. **Remove publish system entirely** - Delete `publishStatus`, `publishedAt`, `publishedBy` fields
4. **Auto-transition through generation** - Script generation automatically triggers audio generation

---

## Phase 1: Database Schema Changes

### Files to Modify
- `packages/db/src/schemas/podcasts.ts`

### Changes

1. **Update `versionStatusEnum`**:
```typescript
export const versionStatusEnum = pgEnum('version_status', [
  'drafting',           // was: draft
  'generating_script',  // NEW
  'script_ready',       // keep
  'generating_audio',   // keep
  'ready',              // was: audio_ready
  'failed',             // keep
]);
```

2. **Remove publish-related infrastructure**:
- Delete `publishStatusEnum`
- Remove `publishStatus`, `publishedAt`, `publishedBy` columns from `podcast` table
- Remove index on `publishStatus`

3. **Database migration notes**:
- Map existing data: `draft` → `drafting`, `audio_ready` → `ready`
- Drop unused `publishStatus` column (currently always 'draft')

---

## Phase 2: API Contract Updates

### Files to Modify
- `packages/api/src/contracts/podcasts.ts`

### Changes

1. **Update `versionStatusSchema`**:
```typescript
export const versionStatusSchema = v.picklist([
  'drafting',
  'generating_script',
  'script_ready',
  'generating_audio',
  'ready',
  'failed',
]);
```

2. **Remove `publishStatus` from output schemas**:
- Remove from `podcastSchema`
- Remove from serializers

3. **Simplify endpoints**:
- Keep `generate` - now always generates full script+audio
- Remove `generateScript` and `generateAudio` as separate endpoints
- Add `saveChanges` endpoint:
  - Input: `{ podcastId, segments?, voiceSettings? }`
  - Validates podcast is in "ready" state
  - Updates transcript/voice if provided
  - Triggers audio regeneration
  - Returns job ID

---

## Phase 3: Service Layer Updates

### Files to Modify
- `packages/media/src/podcast/use-cases/generate-script.ts`
- `packages/media/src/podcast/use-cases/generate-audio.ts`
- `packages/media/src/podcast/repos/script-version-repo.ts`
- `packages/media/src/podcast/podcast-service.ts`

### Changes

1. **Update status transitions in `generate-script.ts`**:
   - Start: set status to `generating_script`
   - Complete: set status to `script_ready`

2. **Update status transitions in `generate-audio.ts`**:
   - Start: set status to `generating_audio`
   - Complete: set status to `ready`

3. **Add `saveChanges` use case**:
```typescript
// Only allowed when status is 'ready'
// Updates segments and/or voice settings
// Triggers audio regeneration
// Status flow: ready → generating_audio → ready
```

4. **Update version repo**:
   - Add method to update segments (for script edits)
   - Validate status is "ready" before allowing edits

---

## Phase 4: API Handler Updates

### Files to Modify
- `packages/api/src/server/router/podcast.ts`
- `packages/db/src/serializers/podcast.ts`

### Changes

1. **Simplify generation endpoints**:
   - `generate`: Creates script + audio in one pipeline
   - Remove separate `generateScript`/`generateAudio` endpoints

2. **Add `saveChanges` handler**:
   - Validate status is "ready"
   - Accept script segment updates and/or voice changes
   - Queue audio regeneration job
   - Return job ID for polling

3. **Update serializers**:
   - Remove `publishStatus`, `publishedAt`, `publishedBy`

---

## Phase 5: Worker/Queue Updates

### Files to Modify
- `apps/server/src/workers/handlers.ts`
- `packages/queue/src/types.ts`

### Changes

1. **Simplify job types**:
   - Keep `PODCAST_GENERATE` (full pipeline)
   - Add `PODCAST_SAVE_CHANGES` job type
   - Remove separate script-only or audio-only jobs if they exist

2. **Update status transitions in handlers**:
   - Use new status values

---

## Phase 6: Frontend Updates

### Files to Modify
- `apps/web/src/routes/_protected/podcasts/-constants/status.ts`
- `apps/web/src/routes/_protected/podcasts/-components/config-panel.tsx`
- `apps/web/src/routes/_protected/podcasts/-components/podcast-settings.tsx`
- `apps/web/src/routes/_protected/podcasts/-components/setup/`
- `apps/web/src/routes/_protected/podcasts/-components/smart-actions.tsx`
- `apps/web/src/routes/_protected/podcasts/-components/script-panel/`

### Changes

1. **Update status constants**:
```typescript
export const STATUS_CONFIG: Record<VersionStatus, StatusConfig> = {
  drafting: { label: 'Drafting', variant: 'secondary', ... },
  generating_script: { label: 'Generating Script', variant: 'default', ... },
  script_ready: { label: 'Script Ready', variant: 'success', ... },
  generating_audio: { label: 'Generating Audio', variant: 'default', ... },
  ready: { label: 'Ready', variant: 'success', ... },
  failed: { label: 'Failed', variant: 'destructive', ... },
};
```

2. **Disable settings until "ready"**:
```typescript
// In config-panel.tsx
const isReady = podcast.activeVersion?.status === 'ready';
<PodcastSettings disabled={!isReady || isGenerating} ... />
```

3. **Add "Save Changes" button**:
   - Only visible when status is "ready"
   - Tracks dirty state for script/voice edits
   - Calls `saveChanges` mutation
   - Shows regeneration progress

4. **Simplify action bar**:
   - `drafting`: "Generate Podcast" button only
   - `generating_*`: Progress indicator
   - `ready`: "Save Changes" button (enabled when dirty)
   - `failed`: "Retry" button

5. **Remove setup wizard complexity**:
   - Simplify to: add documents → configure → generate
   - No intermediate "script-only" generation option

---

## Phase 7: Remove Dead Code

### Files to Delete/Clean
- Remove any publish-related components
- Remove separate "Generate Script" / "Generate Audio" UI buttons
- Clean up unused status handling code

---

## Migration Strategy

1. **Data Migration SQL**:
```sql
-- Update existing version statuses
UPDATE podcast_script
SET status = 'drafting'
WHERE status = 'draft';

UPDATE podcast_script
SET status = 'ready'
WHERE status = 'audio_ready';

-- Drop publish columns (all data is 'draft' anyway)
ALTER TABLE podcast DROP COLUMN publish_status;
ALTER TABLE podcast DROP COLUMN published_at;
ALTER TABLE podcast DROP COLUMN published_by;
```

2. **Deploy Order**:
   - Deploy backend changes first (backwards compatible)
   - Run migration
   - Deploy frontend changes

---

## Testing Checklist

- [ ] New podcast starts in `drafting` status
- [ ] Generation flow: `drafting` → `generating_script` → `script_ready` → `generating_audio` → `ready`
- [ ] Settings locked until `ready` state
- [ ] Script edits work in `ready` state
- [ ] Voice changes work in `ready` state
- [ ] "Save Changes" triggers audio regeneration
- [ ] Failed state shows error and allows retry
- [ ] E2E tests updated and passing
- [ ] Type checks passing
- [ ] No references to old status values remain

---

## Files Summary

### Backend (packages/)
| File | Action |
|------|--------|
| `db/src/schemas/podcasts.ts` | Update enums, remove publish fields |
| `db/src/serializers/podcast.ts` | Remove publish fields from serialization |
| `api/src/contracts/podcasts.ts` | Update status schema, add saveChanges |
| `api/src/server/router/podcast.ts` | Simplify endpoints, add saveChanges |
| `media/src/podcast/use-cases/generate-script.ts` | Update status values |
| `media/src/podcast/use-cases/generate-audio.ts` | Update status values |
| `media/src/podcast/repos/script-version-repo.ts` | Add segment update method |
| `queue/src/types.ts` | Add PODCAST_SAVE_CHANGES job type |

### Frontend (apps/web/)
| File | Action |
|------|--------|
| `routes/_protected/podcasts/-constants/status.ts` | Update status mappings |
| `routes/_protected/podcasts/-components/config-panel.tsx` | Disable until ready |
| `routes/_protected/podcasts/-components/podcast-settings.tsx` | Lock until ready |
| `routes/_protected/podcasts/-components/smart-actions.tsx` | Simplify actions |
| `routes/_protected/podcasts/-components/script-panel/` | Add save functionality |

### Server (apps/server/)
| File | Action |
|------|--------|
| `src/workers/handlers.ts` | Update status values, add save handler |

---

## Estimated Scope

- ~15 files to modify
- ~3 new files (save use case, types)
- 1 migration script
- E2E test updates
