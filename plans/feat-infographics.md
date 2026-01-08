# Infographic Implementation Plan

> **STATUS: NOT STARTED**

## Overview

Add an "Infographics" media type that enables users to generate visual content (data visualizations, process diagrams, key metrics summaries) using Google Imagen. Unlike voiceovers/podcasts, infographics support version history for rapid iteration - each generation creates a new version that users can download, compare, or use as a starting point for the next iteration.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Database | Separate `infographic` + `infographicVersion` tables |
| Backend | New domain in `packages/media/src/infographic/` |
| Frontend | New feature folder `apps/web/src/features/infographics/` |
| AI Integration | New image generation service in `@repo/ai` package |
| Version Model | Each generation creates new version; all versions kept |
| Collaboration | **None** - simpler than voiceovers/podcasts |
| Input Sources | Documents + user-provided text |
| Templates | Predefined style templates + freeform customization |

## Validation Commands

```bash
# Package-specific
pnpm --filter @repo/ai typecheck
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
packages/ai/src/
├── image-generation/                   # NEW: Image generation service
│   ├── index.ts
│   ├── service.ts                      # ImageGeneration service interface
│   └── providers/
│       └── google.ts                   # Google Imagen provider

packages/db/src/schemas/
├── infographics.ts                     # NEW: infographic + infographicVersion tables

packages/media/src/
├── infographic/                        # NEW: infographic domain
│   ├── index.ts
│   ├── repos/
│   │   ├── infographic-repo.ts
│   │   └── version-repo.ts
│   ├── use-cases/
│   │   ├── create-infographic.ts
│   │   ├── update-infographic.ts
│   │   ├── delete-infographic.ts
│   │   ├── get-infographic.ts
│   │   ├── list-infographics.ts
│   │   ├── generate-image.ts           # Text/doc → Imagen → storage
│   │   ├── start-generation.ts         # Queue job
│   │   ├── get-version.ts
│   │   ├── list-versions.ts
│   │   └── delete-version.ts
│   └── templates.ts                    # Predefined style templates

packages/api/src/
├── contracts/infographics.ts           # NEW: oRPC contract
└── server/router/infographic.ts        # NEW: route handlers

apps/server/src/workers/
└── infographic-worker.ts               # NEW: job processor

apps/web/src/features/infographics/     # NEW: frontend feature
├── components/
│   ├── infographic-list.tsx
│   ├── infographic-detail-container.tsx
│   ├── infographic-detail.tsx
│   └── workbench/
│       ├── workbench-layout.tsx
│       ├── content-editor.tsx          # Text input + document selector
│       ├── template-selector.tsx       # Style template picker
│       ├── style-customizer.tsx        # Colors, aesthetics form
│       ├── generation-status.tsx
│       ├── version-gallery.tsx         # Grid of all versions
│       ├── version-card.tsx            # Single version with download
│       └── action-bar.tsx
├── hooks/
│   ├── use-infographic.ts
│   ├── use-infographic-list.ts
│   ├── use-versions.ts
│   ├── use-generate-infographic.ts
│   └── use-infographic-settings.ts
├── lib/
│   ├── templates.ts                    # Template definitions
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
- [ ] `standards/frontend/forms.md` - Form patterns (for style customizer)

### Review Existing Implementations
- [ ] `packages/ai/src/tts/` - AI service pattern to follow
- [ ] `packages/media/src/voiceover/` - Simpler media type pattern
- [ ] `packages/media/src/podcast/` - Document source pattern
- [ ] `apps/web/src/features/voiceovers/` - Workbench UI patterns

**No code changes in this step** - understanding only.

---

## Sprint 1: Image Generation Service

**Goal**: Add Google Imagen integration to `@repo/ai` package

### 1.1 Add image generation errors to `packages/ai/src/errors.ts`

```typescript
export class ImageGenerationError extends Schema.TaggedError<ImageGenerationError>()(
  'ImageGenerationError',
  { message: Schema.String, cause: Schema.optional(Schema.Unknown) }
) {
  static readonly httpStatus = 502 as const;
  static readonly httpCode = 'IMAGE_GENERATION_FAILED' as const;
  static readonly httpMessage = 'Image generation service unavailable';
  static readonly logLevel = 'error' as const;
}

export class ImageGenerationQuotaError extends Schema.TaggedError<ImageGenerationQuotaError>()(
  'ImageGenerationQuotaError',
  { message: Schema.String }
) {
  static readonly httpStatus = 429 as const;
  static readonly httpCode = 'IMAGE_QUOTA_EXCEEDED' as const;
  static readonly httpMessage = 'Image generation quota exceeded';
  static readonly logLevel = 'warn' as const;
}
```

### 1.2 Create `packages/ai/src/image-generation/service.ts`

```typescript
export interface GenerateImageOptions {
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly width?: number;   // Default 1024
  readonly height?: number;  // Default 1024
  readonly style?: string;   // Template style hint
}

export interface GenerateImageResult {
  readonly imageData: Buffer;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
}

export interface ImageGenerationService {
  readonly generate: (options: GenerateImageOptions) =>
    Effect.Effect<GenerateImageResult, ImageGenerationError | ImageGenerationQuotaError>;
}

export class ImageGeneration extends Context.Tag('@repo/ai/ImageGeneration')<
  ImageGeneration,
  ImageGenerationService
>() {}
```

### 1.3 Create `packages/ai/src/image-generation/providers/google.ts`

- Implement Google Imagen API integration
- Use `Effect.tryPromise()` with error mapping
- Add observability with `Effect.withSpan()`
- Export `GoogleImageLive` layer

### 1.4 Export from `packages/ai/src/index.ts`

- Export service, types, provider
- Add to `GoogleAILive` combined layer

### 1.5 Add mock image service for testing

Location: `packages/testing/src/mocks/image-generation.ts`

**Validation**: `pnpm --filter @repo/ai typecheck && pnpm --filter @repo/ai test`

---

## Sprint 2: Database Schema

**Goal**: Create database tables for infographics with version history

### 2.1 Create `packages/db/src/schemas/infographics.ts`

```typescript
export const infographicStatusEnum = pgEnum('infographic_status', [
  'drafting',
  'generating',
  'ready',
  'failed'
]);

export const InfographicStatus = {
  DRAFTING: 'drafting',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const infographicTemplateEnum = pgEnum('infographic_template', [
  'data_visualization',
  'process_diagram',
  'comparison',
  'timeline',
  'summary',
  'custom'
]);

export const InfographicTemplate = {
  DATA_VISUALIZATION: 'data_visualization',
  PROCESS_DIAGRAM: 'process_diagram',
  COMPARISON: 'comparison',
  TIMELINE: 'timeline',
  SUMMARY: 'summary',
  CUSTOM: 'custom',
} as const;

export const infographic = pgTable('infographic', {
  id: varchar('id', { length: 20 }).primaryKey().$defaultFn(() => createId()),
  title: varchar('title', { length: 255 }).notNull(),

  // Content sources
  sourceText: text('source_text'),                    // User-provided text
  sourceDocumentIds: jsonb('source_document_ids').$type<string[]>().default([]),

  // Template & styling
  template: infographicTemplateEnum('template').notNull().default('summary'),
  customPrompt: text('custom_prompt'),                // Freeform instructions
  styleConfig: jsonb('style_config').$type<{
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    fontStyle?: 'modern' | 'classic' | 'minimal';
    mood?: string;
  }>(),

  // Current/active version reference
  activeVersionId: varchar('active_version_id', { length: 20 }),
  versionCount: integer('version_count').notNull().default(0),

  // Generation state
  status: infographicStatusEnum('status').notNull().default('drafting'),
  errorMessage: text('error_message'),

  // Ownership
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  createdByIdx: index('infographic_created_by_idx').on(table.createdBy),
  statusIdx: index('infographic_status_idx').on(table.status),
}));

export const infographicVersion = pgTable('infographic_version', {
  id: varchar('id', { length: 20 }).primaryKey().$defaultFn(() => createId()),
  infographicId: varchar('infographic_id', { length: 20 })
    .notNull()
    .references(() => infographic.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),

  // Generated image
  imageUrl: text('image_url'),
  imageKey: text('image_key'),              // Storage key
  thumbnailUrl: text('thumbnail_url'),
  thumbnailKey: text('thumbnail_key'),
  mimeType: varchar('mime_type', { length: 50 }),
  fileSize: integer('file_size'),
  width: integer('width'),
  height: integer('height'),

  // Generation context (for reproducibility/audit)
  generationPrompt: text('generation_prompt'),       // Final prompt sent to Imagen
  generationConfig: jsonb('generation_config').$type<{
    template: string;
    styleConfig: Record<string, unknown>;
    sourceDocumentIds: string[];
  }>(),

  // Forked from (if iterating on previous version)
  forkedFromVersionId: varchar('forked_from_version_id', { length: 20 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  infographicIdx: index('infographic_version_infographic_idx').on(table.infographicId),
  versionNumberIdx: index('infographic_version_number_idx').on(table.infographicId, table.versionNumber),
}));
```

### 2.2 Export from `packages/db/src/schema.ts`

### 2.3 Add serializers

- `serializeInfographic()` / `serializeInfographicEffect()`
- `serializeInfographicVersion()` / `serializeInfographicVersionEffect()`
- Batch serializers for lists

### 2.4 Run migration

```bash
pnpm --filter @repo/db exec drizzle-kit push
```

**Validation**: `pnpm --filter @repo/db typecheck && pnpm --filter @repo/db build`

---

## Sprint 3: Backend Repositories

**Goal**: Database access layer for infographics

### 3.1 Create `packages/media/src/infographic/repos/infographic-repo.ts`

Methods:
- `insert(data)` - Create new infographic
- `findById(id)` - Get by ID
- `update(id, data)` - Update settings
- `delete(id)` - Hard delete (cascades to versions)
- `list(userId, pagination)` - List user's infographics
- `count(userId)` - Count for pagination
- `updateStatus(id, status, errorMessage?)` - Status transitions
- `setActiveVersion(id, versionId)` - Set active version
- `incrementVersionCount(id)` - Bump version count

### 3.2 Create `packages/media/src/infographic/repos/version-repo.ts`

Methods:
- `insert(data)` - Create new version
- `findById(id)` - Get by ID
- `findByInfographicId(infographicId)` - List all versions
- `findLatest(infographicId)` - Get most recent version
- `delete(id)` - Delete single version
- `deleteAllForInfographic(infographicId)` - Delete all versions
- `updateImage(id, imageData)` - Set image URLs after generation

### 3.3 Export from `packages/media/src/infographic/index.ts`

### 3.4 Add to media package exports

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media build`

---

## Sprint 4: Backend Use Cases - Core CRUD

**Goal**: Business logic for infographic management

### 4.1 Create `create-infographic.ts`

- Create with title
- Set `drafting` status
- Return new infographic

### 4.2 Create `update-infographic.ts`

- Authorization: owner only
- Update title, sourceText, sourceDocumentIds, template, customPrompt, styleConfig
- Validate sourceDocumentIds exist (like podcast)

### 4.3 Create `delete-infographic.ts`

- Authorization: owner only
- Hard delete (versions cascade)

### 4.4 Create `get-infographic.ts`

- Load infographic with active version
- Authorization: owner only (no collaborators)

### 4.5 Create `list-infographics.ts`

- List user's infographics with pagination
- Include active version thumbnail

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 5: Backend Use Cases - Generation

**Goal**: Image generation workflow

### 5.1 Create `packages/media/src/infographic/templates.ts`

Define template prompts:

```typescript
export const INFOGRAPHIC_TEMPLATES = {
  data_visualization: {
    name: 'Data Visualization',
    description: 'Charts, graphs, and data-driven visuals',
    promptPrefix: 'Create a professional data visualization infographic showing',
    defaultStyle: { fontStyle: 'modern' },
  },
  process_diagram: {
    name: 'Process Diagram',
    description: 'Step-by-step workflows and processes',
    promptPrefix: 'Create a clear process diagram infographic illustrating',
    defaultStyle: { fontStyle: 'minimal' },
  },
  comparison: {
    name: 'Comparison',
    description: 'Side-by-side comparisons',
    promptPrefix: 'Create an infographic comparing',
    defaultStyle: { fontStyle: 'modern' },
  },
  timeline: {
    name: 'Timeline',
    description: 'Chronological events and milestones',
    promptPrefix: 'Create a timeline infographic showing',
    defaultStyle: { fontStyle: 'classic' },
  },
  summary: {
    name: 'Summary',
    description: 'Key points and highlights',
    promptPrefix: 'Create an infographic summarizing',
    defaultStyle: { fontStyle: 'modern' },
  },
  custom: {
    name: 'Custom',
    description: 'Fully custom prompt',
    promptPrefix: '',
    defaultStyle: {},
  },
} as const;
```

### 5.2 Create `build-generation-prompt.ts`

- Combine template prompt + source content + custom prompt
- Extract key content from documents (fetch from storage)
- Build style instructions from styleConfig

### 5.3 Create `generate-image.ts`

Worker use case:
1. Load infographic and validate
2. Build generation prompt from template + sources + customPrompt
3. Call `ImageGeneration.generate()`
4. Upload image to storage: `infographics/{id}/v{version}.png`
5. Generate thumbnail
6. Create new version record
7. Update infographic: status → `ready`, set activeVersionId, increment versionCount

### 5.4 Create `start-generation.ts`

API use case:
1. Authorization: owner only
2. Validate has content (sourceText or sourceDocumentIds or customPrompt)
3. Set status → `generating`
4. Enqueue job with `forkedFromVersionId` if iterating

### 5.5 Create `get-job.ts`

- Return job status for polling

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 6: Backend Use Cases - Versions

**Goal**: Version management

### 6.1 Create `list-versions.ts`

- Return all versions for an infographic
- Ordered by versionNumber descending (newest first)
- Include thumbnail URLs

### 6.2 Create `get-version.ts`

- Get single version with full image URL
- For download functionality

### 6.3 Create `delete-version.ts`

- Authorization: owner only
- Cannot delete active version (must set different active first)
- Update versionCount after delete

### 6.4 Create `set-active-version.ts`

- Set any existing version as the active/current one

**Validation**: `pnpm --filter @repo/media typecheck && pnpm --filter @repo/media test`

---

## Sprint 7: API Contract & Router

**Goal**: HTTP API for infographics

### 7.1 Create `packages/api/src/contracts/infographics.ts`

```
GET    /infographics                           # List (owned only)
POST   /infographics                           # Create (title only)
GET    /infographics/:id                       # Get single with active version
PATCH  /infographics/:id                       # Update settings
DELETE /infographics/:id                       # Delete

POST   /infographics/:id/generate              # Start generation → returns jobId
GET    /infographics/jobs/:jobId               # Poll job status

GET    /infographics/:id/versions              # List all versions
GET    /infographics/:id/versions/:versionId   # Get version (for download)
DELETE /infographics/:id/versions/:versionId   # Delete version
PATCH  /infographics/:id/active-version        # Set active version
```

### 7.2 Create `packages/api/src/server/router/infographic.ts`

### 7.3 Register router in main app

### 7.4 Add job type: `'generate-infographic-image'`

**Validation**: `pnpm --filter @repo/api typecheck && pnpm --filter @repo/api build`

---

## Sprint 8: Background Worker

**Goal**: Process infographic generation jobs

### 8.1 Create `apps/server/src/workers/infographic-worker.ts`

### 8.2 Add handler for `generate-infographic-image` job type

- Load infographic
- Call `generateImage` use case
- Handle errors with retry logic

### 8.3 Emit SSE events on completion

- `job_completion` event with status
- `entity_change` event for cache invalidation (type: 'infographic')

### 8.4 Register worker in server startup

Add to `apps/server/src/server.ts`:
```typescript
const infographicWorker = createInfographicWorker({...});
```

**Validation**: `pnpm --filter server typecheck && pnpm --filter server build`

---

## Sprint 9: Frontend - Routes & List

**Goal**: Infographic list page

### 9.1 Create routes

- `/infographics` - List page
- `/infographics/$infographicId` - Detail/workbench page

### 9.2 Create `infographic-list.tsx`

- Grid of infographics with thumbnails
- Title, status badge, version count
- Create new button

### 9.3 Create `use-infographic-list.ts` hook

### 9.4 Add navigation link in sidebar/nav

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 10: Frontend - Workbench Layout

**Goal**: Main infographic editing interface structure

### 10.1 Create `workbench-layout.tsx`

Two-column layout:
- Left: Content & settings (scrollable)
- Right: Preview/version gallery

### 10.2 Create `content-editor.tsx`

- Textarea for source text
- Document selector (multi-select from user's documents)
- Character/word count

### 10.3 Create `infographic-detail-container.tsx`

Container with data fetching:
- `useInfographic(id)`
- `useVersions(id)`
- SSE subscription for real-time updates

### 10.4 Create `infographic-detail.tsx`

Pure presenter component

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 11: Frontend - Template & Style

**Goal**: Template selection and style customization

### 11.1 Create `template-selector.tsx`

- Visual grid of template options
- Icon + name + description for each
- Selected state styling

### 11.2 Create `style-customizer.tsx`

Form fields:
- Primary color picker
- Secondary color picker
- Background color picker
- Font style selector (modern/classic/minimal)
- Mood/tone text input
- Custom prompt textarea (freeform)

### 11.3 Create `use-infographic-settings.ts`

- Track local form state
- Dirty checking for unsaved changes
- Auto-save debounced updates

### 11.4 Create `lib/templates.ts`

Frontend template definitions matching backend

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 12: Frontend - Generation & Versions

**Goal**: Generation flow and version management

### 12.1 Create `action-bar.tsx`

- Generate button (enabled when has content)
- "Start fresh" vs "Iterate on current" options
- Disabled during generation

### 12.2 Create `generation-status.tsx`

- Progress indicator during generation
- Error display on failure
- Retry button

### 12.3 Create `version-gallery.tsx`

- Grid/list of all versions
- Thumbnails with version numbers
- Active version indicator
- Click to preview full size

### 12.4 Create `version-card.tsx`

- Thumbnail image
- Version number badge
- Download button
- "Set as active" button
- Delete button (if not active)
- "Iterate from this" button

### 12.5 Create `use-generate-infographic.ts`

- Mutation hook for starting generation
- Optimistic status update
- SSE subscription for completion

### 12.6 Create `use-versions.ts`

- Query hook for version list
- Mutations for delete, set-active

### 12.7 Wire up SSE handlers

Add infographic to entity change handler in `apps/web/src/shared/hooks/sse-handlers.ts`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 13: Frontend - Download & Preview

**Goal**: Image viewing and download functionality

### 13.1 Create image preview modal

- Full-size image view
- Zoom controls
- Download button

### 13.2 Implement download functionality

- Download current/active version
- Download any specific version
- Proper filename: `{title}-v{version}.png`

### 13.3 Create `lib/status.ts`

Status helpers:
- `isGenerating()`
- `isReady()`
- `canEdit()`
- `canGenerate()`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 14: Testing - Backend

**Goal**: Backend test coverage

### 14.1 Image generation service tests

Location: `packages/ai/src/image-generation/__tests__/`
- Mock provider tests
- Error handling tests

### 14.2 Use case tests

Location: `packages/media/src/infographic/use-cases/__tests__/`
- CRUD use cases
- Generation use case (with mock image service)
- Version management use cases
- Authorization tests

### 14.3 Integration tests

Location: `packages/api/src/server/router/__tests__/infographic.integration.test.ts`
- All API endpoints
- Authentication/authorization
- Error responses

**Validation**: `pnpm --filter @repo/ai test && pnpm --filter @repo/media test && pnpm --filter @repo/api test`

---

## Sprint 15: Testing - Frontend

**Goal**: Frontend test coverage

### 15.1 MSW handlers

Location: `apps/web/src/features/infographics/__tests__/handlers.ts`
- CRUD endpoints
- Generation with job polling
- Version endpoints

### 15.2 Component tests

Priority components:
- `infographic-detail-container.test.tsx`
- `template-selector.test.tsx`
- `style-customizer.test.tsx`
- `version-gallery.test.tsx`
- `action-bar.test.tsx`

### 15.3 E2E tests

Location: `apps/web/e2e/tests/infographics/`
- Create infographic flow
- Configure template and styles
- Generate image (with polling)
- View versions
- Download image
- Iterate on version

**Validation**: `pnpm --filter web test && pnpm test:e2e`

---

## Sprint 16: Polish & Edge Cases

**Goal**: Handle edge cases and polish UX

### 16.1 Handle edge cases

- Empty content validation (disable generate)
- Generation in progress (disable editing, show spinner)
- Failed generation (show error, allow retry)
- Large document handling (truncate/summarize)
- No versions yet state
- Delete last version warning

### 16.2 Loading states

- Skeleton loaders for list and workbench
- Optimistic updates for settings changes

### 16.3 Error boundaries

- Graceful error handling for failed image loads
- Retry mechanisms

### 16.4 Accessibility

- Keyboard navigation for template selector
- Alt text for generated images
- Screen reader announcements for generation status

**Validation**: `pnpm typecheck && pnpm test && pnpm build`

---

## Key Files to Modify

| File | Action | Sprint |
|------|--------|--------|
| `packages/ai/src/errors.ts` | Modify - add image errors | 1 |
| `packages/ai/src/image-generation/` | Create - entire service | 1 |
| `packages/ai/src/index.ts` | Modify - export image service | 1 |
| `packages/testing/src/mocks/image-generation.ts` | Create - mock service | 1 |
| `packages/db/src/schemas/infographics.ts` | Create - new schema | 2 |
| `packages/db/src/schema.ts` | Modify - export new tables | 2 |
| `packages/media/src/infographic/` | Create - entire domain | 3-6 |
| `packages/api/src/contracts/infographics.ts` | Create - API contract | 7 |
| `packages/api/src/server/router/infographic.ts` | Create - route handlers | 7 |
| `apps/server/src/workers/infographic-worker.ts` | Create - job processor | 8 |
| `apps/server/src/server.ts` | Modify - register worker | 8 |
| `apps/web/src/features/infographics/` | Create - entire feature | 9-13 |
| `apps/web/src/shared/hooks/sse-handlers.ts` | Modify - add infographic entity | 12 |

---

## Success Criteria

- [ ] **Sprint 1**: Image generation service working with Google Imagen
- [ ] **Sprint 2**: Database tables created and migrated
- [ ] **Sprint 3**: Repositories with full CRUD for infographics and versions
- [ ] **Sprint 4**: Core CRUD use cases working
- [ ] **Sprint 5**: Generation use cases working (prompt building, image creation)
- [ ] **Sprint 6**: Version management use cases working
- [ ] **Sprint 7**: API endpoints accessible
- [ ] **Sprint 8**: Background jobs processing, SSE events emitting
- [ ] **Sprint 9**: List page renders infographics with thumbnails
- [ ] **Sprint 10**: Workbench layout renders with content editor
- [ ] **Sprint 11**: Template selector and style customizer functional
- [ ] **Sprint 12**: Generation triggers, versions display, iteration works
- [ ] **Sprint 13**: Download and preview functionality complete
- [ ] **Sprint 14**: Backend tests passing
- [ ] **Sprint 15**: Frontend tests passing
- [ ] **Sprint 16**: Edge cases handled, polish complete

Each sprint maintains working functionality with passing build.

---

## Standards Reference

- `standards/patterns/use-case.md` - Backend use case pattern
- `standards/patterns/repository.md` - Repository pattern
- `standards/patterns/error-handling.md` - Error handling
- `standards/patterns/enum-constants.md` - Status enum pattern
- `standards/patterns/router-handler.md` - API handler pattern
- `standards/frontend/components.md` - Container/presenter pattern
- `standards/frontend/mutations.md` - Optimistic updates
- `standards/frontend/data-fetching.md` - Query patterns
- `standards/frontend/forms.md` - Form patterns
- `standards/testing/use-case-tests.md` - Use case testing
- `standards/testing/integration-tests.md` - API integration testing
- `standards/frontend/testing.md` - Component testing
