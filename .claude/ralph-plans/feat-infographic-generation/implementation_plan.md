# Infographic Generation Feature Implementation Plan

> **STATUS: IN_PROGRESS**

## Overview

Add an infographic generation feature that allows users to select text from multiple documents, choose an infographic type (timeline, comparison, statistical, process, etc.), provide custom instructions, and generate visual infographics using Google's Gemini image generation API. The feature includes AI-assisted key point extraction, manual text highlighting, persistent selections, and regeneration with feedback.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Image Generation API | Google Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) |
| Output Format | PNG only |
| Aspect Ratio | User selectable (1:1, 16:9, 9:16, etc.) |
| Collaboration | Owner only (no collaborators) |
| Text Selection | Highlight & add + AI-assisted extraction (on-demand) |
| Selection Persistence | Saved to database |
| Prompt Storage | Code constants in `prompts.ts` |
| Status Flow | `drafting` → `generating` → `ready` / `failed` |
| Selection Limit | Soft limit with warning (~10 selections) |
| Long Text Handling | Character limit per selection |
| Infographic Types | 6-8 types with single optimized style each |
| Regeneration | Text instructions + structured options |

## Validation Commands

```bash
# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter @repo/ai typecheck
pnpm --filter @repo/media typecheck
pnpm --filter @repo/api typecheck
pnpm --filter web typecheck

# Full validation
pnpm typecheck && pnpm build && pnpm test
```

## Target Architecture

```
packages/
├── ai/src/
│   └── image/                              # NEW: Image generation service
│       ├── index.ts
│       ├── service.ts                      # ImageService interface + Context.Tag
│       ├── errors.ts                       # ImageError, ImageQuotaExceededError
│       └── providers/
│           └── google.ts                   # GoogleImageLive layer
├── db/src/schemas/
│   └── infographics.ts                     # NEW: Infographic + InfographicSelection schemas
├── media/src/
│   └── infographic/                        # NEW: Infographic domain
│       ├── index.ts
│       ├── prompts.ts                      # Infographic type prompts
│       ├── repos/
│       │   ├── infographic-repo.ts
│       │   └── selection-repo.ts
│       └── use-cases/
│           ├── create-infographic.ts
│           ├── update-infographic.ts
│           ├── delete-infographic.ts
│           ├── list-infographics.ts
│           ├── get-infographic.ts
│           ├── add-selection.ts
│           ├── remove-selection.ts
│           ├── update-selection.ts
│           ├── extract-key-points.ts       # AI-assisted extraction
│           ├── start-generation.ts
│           └── generate-infographic.ts
├── api/src/
│   ├── contracts/
│   │   └── infographics.ts                 # NEW: API contract
│   └── server/router/
│       └── infographic.ts                  # NEW: API router
└── queue/src/
    └── types.ts                            # Add 'generate-infographic' job type

apps/
├── server/src/workers/
│   ├── infographic-worker.ts               # NEW: Worker
│   └── infographic-handlers.ts             # NEW: Job handlers
└── web/src/
    ├── features/
    │   └── infographics/                   # NEW: Frontend feature
    │       ├── components/
    │       │   ├── infographic-list.tsx
    │       │   ├── infographic-list-container.tsx
    │       │   ├── infographic-item.tsx
    │       │   ├── infographic-detail.tsx
    │       │   ├── infographic-detail-container.tsx
    │       │   └── workbench/
    │       │       ├── workbench-layout.tsx
    │       │       ├── document-selector.tsx
    │       │       ├── document-content-panel.tsx
    │       │       ├── text-highlighter.tsx      # Text selection component
    │       │       ├── selection-list.tsx
    │       │       ├── selection-item.tsx
    │       │       ├── ai-suggestions-panel.tsx
    │       │       ├── type-selector.tsx
    │       │       ├── aspect-ratio-selector.tsx
    │       │       ├── style-options.tsx
    │       │       ├── custom-instructions.tsx
    │       │       ├── feedback-panel.tsx
    │       │       ├── preview-panel.tsx
    │       │       └── action-bar.tsx
    │       └── hooks/
    │           ├── use-infographic.ts
    │           ├── use-infographic-list.ts
    │           ├── use-infographic-settings.ts
    │           ├── use-selections.ts
    │           ├── use-text-highlight.ts
    │           ├── use-ai-extraction.ts
    │           ├── use-optimistic-generation.ts
    │           └── use-optimistic-delete.ts
    └── routes/_protected/
        └── infographics/
            ├── index.tsx                   # List route
            ├── new.tsx                     # Create route
            └── $infographicId.tsx          # Detail/workbench route
```

---

## Issues

<!-- Agent checks this section each pass for user-created issues -->
| Issue | Status | Notes |
|-------|--------|-------|
| _No issues_ | | |

---

## Tasks

### Task 01: Image Generation Service
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/error-handling.md`
**Acceptance Criteria:**
- [x] Create `packages/ai/src/image/service.ts` with `ImageService` interface and `Image` Context.Tag
- [x] Define `GenerateImageOptions` with prompt, aspectRatio, and optional reference images
- [x] Define `GenerateImageResult` with imageContent (Buffer), mimeType, and dimensions
- [x] Create `packages/ai/src/image/errors.ts` with `ImageError` and `ImageQuotaExceededError` (in main errors.ts)
- [x] Create `packages/ai/src/image/providers/google.ts` implementing Gemini 2.5 Flash Image API
- [x] Support aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 21:9
- [x] Export `GoogleImageLive` layer and update `GoogleAILive` combined layer
- [x] Add tracing spans with attributes (aspectRatio, model, provider)
- [x] Mock Image service added to @repo/testing package
**Details:** [01-image-generation-service.md](./tasks/01-image-generation-service.md)

---

### Task 02: Database Schema
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/repository.md`, `standards/patterns/serialization.md`
**Acceptance Criteria:**
- [x] Create `packages/db/src/schemas/infographics.ts` with `infographic` table
- [x] Fields: id (InfographicId), title, status enum (drafting/generating/ready/failed), infographicType, aspectRatio, customInstructions, feedbackInstructions, styleOptions (JSONB), imageUrl, errorMessage, sourceDocumentIds, createdBy, timestamps
- [x] Create `infographic_selection` table for persisted text selections
- [x] Fields: id, infographicId (FK), documentId (FK), selectedText, startOffset, endOffset, orderIndex, createdAt
- [x] Add indexes on createdBy, status, infographicId
- [x] Create serializers: `serializeInfographicEffect`, `serializeInfographicListItemEffect`, `serializeInfographicSelectionEffect`
- [x] Migration: use `pnpm --filter @repo/db push` to push schema to database
- [x] Branded ID types `InfographicId` with `inf_` prefix and `InfographicSelectionId` with `sel_` prefix
**Details:** [02-database-schema.md](./tasks/02-database-schema.md)

---

### Task 03: Infographic Prompts
**Status:** ✅ COMPLETED
**Standards:** Reference `packages/media/src/podcast/prompts.ts` pattern
**Acceptance Criteria:**
- [x] Create `packages/media/src/infographic/prompts.ts`
- [x] Define `InfographicType` const object: timeline, comparison, statistical, process, list, mindMap, hierarchy, geographic
- [x] Create optimized system prompt for each type with design principles and visual style guidance
- [x] Create `buildInfographicPrompt(type, selections, customInstructions, feedbackInstructions, aspectRatio)` function
- [x] Each prompt guides AI to create clear, readable infographics
- [x] Includes guidance for text placement, visual hierarchy, color usage
- [x] Export `INFOGRAPHIC_TYPES` array with id, name, description, icon for UI
- [x] Helper functions: `getSystemPrompt`, `getInfographicTypeInfo`, `isValidInfographicType`
**Details:** [03-infographic-prompts.md](./tasks/03-infographic-prompts.md)

---

### Task 04: Infographic Repository
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/repository.md`
**Acceptance Criteria:**
- [x] Create `packages/media/src/infographic/repos/infographic-repo.ts`
- [x] Implement: insert, findById, findByIdFull (with selections), update, delete, list, count
- [x] Implement: updateStatus, updateImage, clearImage, updateGenerationContext
- [x] Create `packages/media/src/infographic/repos/selection-repo.ts`
- [x] Implement: insert, findById, findByInfographic, update, delete, reorder, bulkInsert, count, deleteByInfographic
- [x] Both repos use Effect Context.Tag pattern
- [x] All queries use Drizzle with withDb helper for tracing
- [x] Added infographic error types to errors.ts (InfographicNotFound, InfographicError, NotInfographicOwner, InfographicSelectionNotFound, InvalidInfographicGeneration)
- [x] Updated Media type and MediaLive layer to include InfographicRepo and SelectionRepo
**Details:** [04-infographic-repository.md](./tasks/04-infographic-repository.md)

---

### Task 05: Core Use Cases (CRUD)
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/use-case.md`, `standards/patterns/error-handling.md`
**Acceptance Criteria:**
- [x] Create `createInfographic.ts` - validates documents owned by user, creates in drafting status
- [x] Create `getInfographic.ts` - retrieves with selections, validates ownership
- [x] Create `updateInfographic.ts` - updates settings (title, type, aspectRatio, instructions, styleOptions)
- [x] Create `deleteInfographic.ts` - validates ownership, cascade delete handled by FK
- [x] Create `listInfographics.ts` - paginated list for user with total count
- [x] All use cases follow Effect pattern with inferred error types
- [x] Add tracing spans with infographic.id and user.id attributes
- [x] Export all use cases and types from @repo/media
**Details:** [05-core-use-cases.md](./tasks/05-core-use-cases.md)

---

### Task 06: Selection Use Cases
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/use-case.md`
**Acceptance Criteria:**
- [x] Create `addSelection.ts` - adds text selection with document reference, enforces character limit (500 chars)
- [x] Create `removeSelection.ts` - removes selection by ID
- [x] Create `updateSelection.ts` - updates text or reorders
- [x] Create `reorderSelections.ts` - bulk reorder selections
- [x] Implement soft limit warning: return `warningMessage` when selections > 10
- [x] Validate documentId belongs to user
- [x] Store exact selected text for audit trail
- [x] Added `SelectionTextTooLong` error to errors.ts
- [x] Exported constants `MAX_SELECTION_LENGTH` (500) and `SELECTION_SOFT_LIMIT` (10)
**Details:** [06-selection-use-cases.md](./tasks/06-selection-use-cases.md)

---

### Task 07: AI Extraction Use Case
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/use-case.md`
**Acceptance Criteria:**
- [x] Create `extractKeyPoints.ts` use case
- [x] Input: infographicId (uses linked documents) or documentIds array
- [x] Calls LLM to extract key points from document content
- [x] Returns structured suggestions: `{ text: string, documentId: string, relevance: 'high' | 'medium' }[]`
- [x] Limit to ~10 suggestions per extraction
- [x] Use existing `LLM` service with Schema for structured output
- [x] Add tracing span
- [x] Includes type-specific extraction guidance based on infographic type
**Details:** [07-ai-extraction-use-case.md](./tasks/07-ai-extraction-use-case.md)

---

### Task 08: Generation Use Cases
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/use-case.md`, reference `packages/media/src/podcast/use-cases/start-generation.ts`
**Acceptance Criteria:**
- [x] Create `startGeneration.ts` - validates infographic, checks for pending job (idempotency), enqueues job
- [x] Create `generateInfographic.ts` - actual generation logic:
  - Builds prompt from selections + type + custom instructions
  - Calls Image service
  - Uploads to storage
  - Updates infographic with imageUrl
- [x] Support regeneration: clears existing image, uses feedbackInstructions if provided
- [x] Update status: drafting → generating → ready/failed
- [x] Store generation context (prompt used, selections at generation time)
- [x] Create `getJob.ts` - retrieves job status for polling
**Details:** [08-generation-use-cases.md](./tasks/08-generation-use-cases.md)

---

### Task 09: Queue Integration
**Status:** ✅ COMPLETED
**Standards:** Reference `packages/queue/src/types.ts`
**Acceptance Criteria:**
- [x] Add `'generate-infographic'` to `JobType` union in `packages/queue/src/types.ts`
- [x] Define `GenerateInfographicPayload` and `GenerateInfographicResult` types
- [x] Add `findPendingJobForInfographic` method to QueueService interface
- [x] Implement in queue repository
**Details:** [09-queue-integration.md](./tasks/09-queue-integration.md)

---

### Task 10: API Contract
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/router-handler.md`, `standards/patterns/serialization.md`
**Acceptance Criteria:**
- [x] Create `packages/api/src/contracts/infographics.ts`
- [x] Define endpoints:
  - GET /infographics - list
  - GET /infographics/:id - get with selections
  - POST /infographics - create
  - PATCH /infographics/:id - update
  - DELETE /infographics/:id - delete
  - POST /infographics/:id/selections - add selection
  - DELETE /infographics/:id/selections/:selectionId - remove selection
  - PATCH /infographics/:id/selections/:selectionId - update selection
  - POST /infographics/:id/selections/reorder - reorder selections
  - POST /infographics/:id/extract-key-points - AI extraction
  - POST /infographics/:id/generate - start generation
  - GET /infographics/jobs/:jobId - poll job status
- [x] Define error types: INFOGRAPHIC_NOT_FOUND, NOT_INFOGRAPHIC_OWNER, SELECTION_NOT_FOUND, SELECTION_TOO_LONG, INVALID_INFOGRAPHIC_GENERATION, DOCUMENT_NOT_FOUND
- [x] Define input/output schemas
**Details:** [10-api-contract.md](./tasks/10-api-contract.md)

---

### Task 11: API Router
**Status:** ✅ COMPLETED
**Standards:** `standards/patterns/router-handler.md`
**Acceptance Criteria:**
- [x] Create `packages/api/src/server/router/infographic.ts`
- [x] Implement all endpoints from contract
- [x] All endpoints use `protectedProcedure`
- [x] Use `handleEffectWithProtocol` for error handling
- [x] Apply serializers to responses
- [x] Add tracing spans with appropriate attributes
- [x] Register router in main app router
**Details:** [11-api-router.md](./tasks/11-api-router.md)

---

### Task 12: Worker Implementation
**Status:** ✅ COMPLETED
**Standards:** Reference `apps/server/src/workers/podcast-worker.ts`
**Acceptance Criteria:**
- [x] Create `apps/server/src/workers/infographic-worker.ts`
- [x] Create `apps/server/src/workers/infographic-handlers.ts`
- [x] Follow same pattern: polling loop, user context via FiberRef, error handling
- [x] Handle `'generate-infographic'` job type
- [x] Emit SSE events on completion (JobCompletionEvent, EntityChangeEvent)
- [x] Configure: pollInterval, maxConsecutiveErrors, exponential backoff
- [x] Export from workers/index.ts for use in server startup
**Details:** [12-worker-implementation.md](./tasks/12-worker-implementation.md)

---

### Task 13: Frontend - Routes and Navigation
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/project-structure.md`
**Acceptance Criteria:**
- [x] Create route files: `apps/web/src/routes/_protected/infographics/index.tsx`, `new.tsx`, `$infographicId.tsx`
- [x] Add "Infographics" to main navigation alongside Podcasts, Voiceovers, Documents
- [x] List route shows infographic cards with status, thumbnail, title
- [x] New route provides quick create flow
- [x] Detail route loads infographic and renders workbench (placeholder)
- [x] Route loaders use `ensureQueryData` pattern
**Details:** [13-frontend-routes.md](./tasks/13-frontend-routes.md)

---

### Task 14: Frontend - Data Fetching Hooks
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/data-fetching.md`
**Acceptance Criteria:**
- [x] Create `apps/web/src/features/infographics/hooks/use-infographic.ts` - single infographic query
- [x] Create `use-infographic-list.ts` - paginated list query
- [x] Create `use-create-infographic.ts` - create mutation with navigation
- [x] Create `use-optimistic-delete.ts` - delete mutation
- [x] Create `use-selections.ts` - manage selections state (with optimistic add/remove/update/reorder)
- [x] Create `use-ai-extraction.ts` - mutation for AI key point extraction
- [x] Create `use-infographic-settings.ts` - local settings state (type, aspectRatio, instructions, title)
- [x] All hooks follow TanStack Query patterns
- [x] Query key factories for cache management
**Details:** [14-frontend-data-hooks.md](./tasks/14-frontend-data-hooks.md)

---

### Task 15: Frontend - List Components
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/components.md`, `standards/frontend/styling.md`
**Acceptance Criteria:**
- [x] Create `InfographicListContainer` - data fetching, state management, uses presenter pattern
- [x] Create `InfographicList` - presenter with search and grid of items
- [x] Create `InfographicItem` - card with icon, title, status badge, type badge, delete button
- [x] Create `InfographicIcon` - type-specific icons for each infographic type
- [x] Empty state with CTA to create first infographic
- [x] Loading skeleton
- [x] Delete functionality with confirmation modal
- [x] Search functionality for filtering list
- [x] Created `lib/status.ts` with status utilities (isGeneratingStatus, getStatusConfig, etc.)
**Details:** [15-frontend-list-components.md](./tasks/15-frontend-list-components.md)

---

### Task 16: Frontend - Workbench Layout
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/components.md`
**Acceptance Criteria:**
- [x] Create `InfographicWorkbenchLayout` - header with back button, title, status, actions
- [x] Two-panel layout: left (document content + selections), right (settings + preview)
- [x] Responsive: stack panels on mobile (via workbench CSS classes)
- [x] Action bar at bottom with Generate/Regenerate button (`InfographicActionBar`)
- [x] Status badge with spinner during generation
**Details:** [16-frontend-workbench-layout.md](./tasks/16-frontend-workbench-layout.md)

---

### Task 17: Frontend - Document Selection Panel
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/components.md`
**Acceptance Criteria:**
- [x] Create `DocumentSelector` - dropdown/modal to add documents to workbench
- [x] Create `DocumentContentPanel` - displays document text for highlighting
- [x] Tabs to switch between added documents
- [x] Document content scrollable with visible text
- [x] "Add Document" button opens selector
- [x] Remove document button (if > 1 document)
**Details:** [17-frontend-document-panel.md](./tasks/17-frontend-document-panel.md)

---

### Task 18: Frontend - Text Highlighter
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/components.md`
**Acceptance Criteria:**
- [x] Create `TextHighlighter` - renders document text with selection capability
- [x] User can click-drag to select text
- [x] Selected text shows highlight overlay
- [x] "Add Selection" button appears near selection
- [x] Existing selections shown with different highlight color
- [x] Click existing selection to remove
- [x] Create `useTextHighlight` hook for selection state
- [x] Enforce 500 character limit per selection with visual feedback
**Details:** [18-frontend-text-highlighter.md](./tasks/18-frontend-text-highlighter.md)

---

### Task 19: Frontend - Selection List
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/components.md`
**Acceptance Criteria:**
- [x] Create `SelectionList` - shows all added selections
- [x] Create `SelectionItem` - displays selection text preview, source document, remove button
- [x] Drag-and-drop reordering (with dnd-kit)
- [x] Warning banner when > 10 selections
- [x] Empty state: "Select text from documents to add content"
- [x] Mutations: add, remove, reorder with optimistic updates (uses existing hooks)
**Details:** [19-frontend-selection-list.md](./tasks/19-frontend-selection-list.md)

---

### Task 20: Frontend - AI Suggestions Panel
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/components.md`, `standards/frontend/mutations.md`
**Acceptance Criteria:**
- [x] Create `AISuggestionsPanel` - collapsible panel
- [x] "Extract Key Points" button triggers AI extraction
- [x] Loading state during extraction
- [x] Display suggestions with relevance indicator (high/medium)
- [x] "Add" button on each suggestion to add to selections
- [x] "Add All" button to add all high-relevance suggestions
- [x] Suggestions show source document name
**Details:** [20-frontend-ai-suggestions.md](./tasks/20-frontend-ai-suggestions.md)

---

### Task 21: Frontend - Settings Panel
**Status:** ✅ COMPLETED
**Standards:** `standards/frontend/components.md`, `standards/frontend/forms.md`
**Acceptance Criteria:**
- [x] Create `TypeSelector` - grid of infographic type cards with icons
- [x] Create `AspectRatioSelector` - visual aspect ratio options
- [x] Create `CustomInstructions` - textarea for custom prompt additions
- [x] Create `StyleOptionsPanel` - structured feedback options (colors, emphasis, etc.)
- [x] Create `FeedbackPanel` - shown after first generation for iteration
- [x] All settings sync with `useInfographicSettings` hook (via SettingsPanel wrapper)
**Details:** [21-frontend-settings-panel.md](./tasks/21-frontend-settings-panel.md)

---

### Task 22: Frontend - Preview and Generation
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`, `standards/frontend/mutations.md`
**Acceptance Criteria:**
- [ ] Create `PreviewPanel` - shows generated infographic image
- [ ] Zoom/pan controls for large images
- [ ] Download button
- [ ] Create `ActionBar` - Generate/Regenerate button with loading state
- [ ] Create `useOptimisticGeneration` hook
- [ ] Poll job status during generation
- [ ] Show progress indicator
- [ ] Success/error toasts
**Details:** [22-frontend-preview-generation.md](./tasks/22-frontend-preview-generation.md)

---

### Task 23: Frontend - Detail Container
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`
**Acceptance Criteria:**
- [ ] Create `InfographicDetailContainer` - orchestrates all workbench components
- [ ] Manages state: infographic data, selections, settings, generation status
- [ ] Handles mutations: save, generate, add/remove selections
- [ ] Keyboard shortcuts (Cmd+S to save)
- [ ] Navigation blocking for unsaved changes
- [ ] SSE subscription for real-time updates
**Details:** [23-frontend-detail-container.md](./tasks/23-frontend-detail-container.md)

---

### Task 24: Integration Testing
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/testing/integration-tests.md`, `standards/frontend/testing.md`
**Acceptance Criteria:**
- [ ] API integration tests for all infographic endpoints
- [ ] Test CRUD operations
- [ ] Test selection management
- [ ] Test generation flow with mock AI
- [ ] Test error cases (not found, not owner, etc.)
- [ ] Frontend integration tests for workbench
- [ ] Test text selection interaction
- [ ] Test generation polling
**Details:** [24-integration-testing.md](./tasks/24-integration-testing.md)

---

### Task 99: Final Verification
**Status:** ⏳ NOT_STARTED
**Standards:** All standards referenced in prior tasks
**Acceptance Criteria:**
- [ ] All prior tasks verified by subagent review
- [ ] No standards violations found
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes
- [ ] End-to-end flow tested manually
**Details:** [99-final-verification.md](./tasks/99-final-verification.md)

---

## Success Criteria

- [ ] **Task 01**: Image generation service works with Gemini 2.5 Flash Image API
- [ ] **Task 02-04**: Database schema and repositories follow existing patterns
- [ ] **Task 05-08**: All use cases implemented with proper error handling
- [ ] **Task 09-12**: Full backend flow: API → Queue → Worker → Storage
- [ ] **Task 13-23**: Complete frontend workbench with text selection, AI suggestions, and generation
- [ ] **Task 24**: Comprehensive test coverage
- [ ] **Task 99**: All code verified against standards, full validation passes

Each task maintains working functionality with passing build.

---

## Standards Reference

- `standards/patterns/repository.md` - Data access layer
- `standards/patterns/use-case.md` - Business logic structure
- `standards/patterns/router-handler.md` - API handler structure
- `standards/patterns/serialization.md` - DB to API transformation
- `standards/patterns/error-handling.md` - Error definition and handling
- `standards/frontend/components.md` - Container/Presenter pattern
- `standards/frontend/data-fetching.md` - TanStack Query patterns
- `standards/frontend/mutations.md` - Optimistic update patterns
- `standards/frontend/forms.md` - TanStack Form patterns
- `standards/testing/integration-tests.md` - API testing
- `standards/frontend/testing.md` - Frontend testing
