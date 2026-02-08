# Infographic Generation Implementation Plan

> **STATUS: NOT_STARTED**

## Overview

Add AI-powered infographic generation to Content Studio using Google Gemini's image generation capabilities (`@google/generative-ai` SDK). Users create infographics from prompts and/or source documents via a two-stage pipeline: LLM content extraction → image generation. The feature follows the existing podcast/voiceover architecture with background job processing, SSE real-time status, and full version history (max 10 per infographic).

## Key Decisions

| Decision | Choice |
|----------|--------|
| Image Gen SDK | `@google/generative-ai` (native Google SDK, not AI SDK) |
| Infographic types (MVP) | Timeline, Comparison, Stats Dashboard, Key Takeaways |
| Style presets | Modern Minimal, Bold & Colorful, Corporate, Playful, Dark Mode, Editorial |
| Formats | Portrait (1080x1920), Square (1080x1080), Landscape (1920x1080), OG Card (1200x630) |
| Document sourcing | Both prompt-only and document-sourced in MVP |
| Job model | Background job via queue + SSE status events |
| Versioning | Full version history (max 10), thumbnails, click-to-compare |
| Export | PNG only (native Gemini output) |
| Safety handling | Friendly error message + allow retry (no auto-rephrase) |
| Branded IDs | `inf_` (infographic), `inv_` (infographic version) |

## Validation Commands

```bash
# Package-specific
pnpm --filter @repo/db typecheck
pnpm --filter @repo/ai typecheck
pnpm --filter @repo/media typecheck
pnpm --filter @repo/api typecheck
pnpm --filter @repo/queue typecheck
pnpm --filter web typecheck

# Full validation
pnpm typecheck && pnpm build && pnpm test
```

## Target Architecture

```
packages/
├── ai/src/
│   ├── image-gen/                           # NEW: Image generation service
│   │   ├── index.ts
│   │   ├── service.ts                       # ImageGenService interface + Context.Tag
│   │   └── providers/
│   │       └── google.ts                    # GoogleImageGenLive layer
│   └── errors.ts                            # + ImageGenError, ImageGenRateLimitError, ImageGenContentFilteredError
├── db/src/schemas/
│   ├── brands.ts                            # + InfographicId (inf_), InfographicVersionId (inv_)
│   └── infographics.ts                      # NEW: infographic + infographic_version tables
├── media/src/
│   └── infographic/                         # NEW: Infographic domain
│       ├── index.ts
│       ├── prompts.ts                       # Type/style/format prompt builders
│       ├── repos/
│       │   ├── index.ts
│       │   └── infographic-repo.ts          # InfographicRepo Context.Tag + Layer
│       └── use-cases/
│           ├── index.ts
│           ├── create-infographic.ts
│           ├── get-infographic.ts
│           ├── list-infographics.ts
│           ├── update-infographic.ts
│           ├── delete-infographic.ts
│           ├── generate-infographic.ts      # Enqueue background job
│           └── get-infographic-versions.ts
├── api/src/
│   ├── contracts/
│   │   ├── events.ts                        # + 'infographic' EntityType, InfographicJobCompletionEvent
│   │   ├── infographics.ts                  # NEW: API contract
│   │   └── index.ts                         # + infographics contract
│   └── server/router/
│       ├── infographics.ts                  # NEW: API router
│       └── index.ts                         # + infographics router
└── queue/src/
    └── types.ts                             # + 'generate-infographic' JobType

apps/
├── server/src/workers/
│   ├── infographic-worker.ts                # NEW: Worker
│   └── index.ts                             # + infographic worker export
└── web/src/
    ├── features/
    │   └── infographics/                    # NEW: Frontend feature
    │       ├── components/
    │       │   ├── infographic-list-container.tsx
    │       │   ├── infographic-list.tsx
    │       │   ├── infographic-workbench-container.tsx
    │       │   ├── infographic-workbench-provider.tsx   # Context provider
    │       │   ├── prompt-panel.tsx
    │       │   ├── preview-panel.tsx
    │       │   ├── version-history-strip.tsx
    │       │   ├── type-selector.tsx
    │       │   ├── style-selector.tsx
    │       │   ├── format-selector.tsx
    │       │   ├── source-document-selector.tsx
    │       │   └── export-dropdown.tsx
    │       └── hooks/
    │           ├── use-infographic.ts
    │           ├── use-infographic-list.ts
    │           ├── use-infographic-actions.ts
    │           └── use-infographic-versions.ts
    ├── shared/hooks/
    │   └── sse-handlers.ts                  # + infographic event handlers
    └── routes/_protected/
        └── infographics/
            ├── index.tsx                    # List route
            └── $infographicId.tsx           # Workbench route
```

---

## Issues

<!-- Agent checks this section each pass for user-created issues -->
| Issue | Status | Notes |
|-------|--------|-------|
| _No issues_ | | |

---

## Tasks

### Task 01: DB Schema + Branded IDs
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/repository.md`, `standards/overview.md`
**Acceptance Criteria:**
- [ ] `InfographicId` (`inf_`) and `InfographicVersionId` (`inv_`) branded types in `packages/db/src/schemas/brands.ts`
- [ ] `infographic` table: id, title, prompt, infographicType (enum), stylePreset (enum), format (enum), sourceDocumentIds (jsonb), imageStorageKey, thumbnailStorageKey, status (enum: draft/generating/ready/failed), errorMessage, createdBy, createdAt, updatedAt
- [ ] `infographic_version` table: id, infographicId (FK), versionNumber, prompt, infographicType, stylePreset, format, imageStorageKey, thumbnailStorageKey, createdAt
- [ ] pgEnums: `infographic_type` (timeline/comparison/stats_dashboard/key_takeaways), `infographic_style` (6 presets), `infographic_format` (portrait/square/landscape/og_card), `infographic_status`
- [ ] Output schemas + Effect serializers following podcasts.ts pattern
- [ ] Exported from `packages/db/src/schema.ts`
- [ ] `pnpm --filter @repo/db typecheck` passes
**Details:** [01-db-schema.md](./tasks/01-db-schema.md)

---

### Task 02: ImageGen AI Service + Domain Errors
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/error-handling.md`
**Acceptance Criteria:**
- [ ] `ImageGenError`, `ImageGenRateLimitError`, `ImageGenContentFilteredError` in `packages/ai/src/errors.ts` with HTTP protocol properties
- [ ] `ImageGen` Context.Tag + `ImageGenService` interface in `packages/ai/src/image-gen/service.ts`
- [ ] `generateImage` method: prompt + format → `{ imageData: Buffer, mimeType: string }`
- [ ] Google provider in `packages/ai/src/image-gen/providers/google.ts` using `@google/generative-ai` with `responseModalities: ['IMAGE']`
- [ ] `GoogleImageGenLive` Layer exported
- [ ] Infographic domain errors (`InfographicNotFound`, `NotInfographicOwner`, `InfographicError`) in `packages/media/src/errors.ts`
- [ ] `pnpm --filter @repo/ai typecheck && pnpm --filter @repo/media typecheck` passes
**Details:** [02-imagegen-service.md](./tasks/02-imagegen-service.md)

---

### Task 03: Infographic Repository + Use Cases
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/repository.md`, `standards/patterns/use-case.md`
**Acceptance Criteria:**
- [ ] `InfographicRepo` in `packages/media/src/infographic/repos/infographic-repo.ts` with Context.Tag + Layer
- [ ] Repo methods: insert, findById, list (by createdBy), update, delete, insertVersion, listVersions, deleteOldVersions (keep max 10)
- [ ] Use cases: create, get, list, update, delete, generate (enqueue job), get-versions
- [ ] Every mutation checks `getCurrentUser` + ownership via `requireOwnership` pattern
- [ ] Every use case has `Effect.withSpan('useCase.xxx')`
- [ ] `pnpm --filter @repo/media typecheck` passes
**Details:** [03-repo-usecases.md](./tasks/03-repo-usecases.md)

---

### Task 04: Prompt Builder + Generation Pipeline
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/use-case.md`
**Acceptance Criteria:**
- [ ] `packages/media/src/infographic/prompts.ts` with prompt builder
- [ ] `buildInfographicPrompt(options)` composes: type directive + content payload + style modifier + aspect ratio + quality control
- [ ] `extractDocumentContent(documentId)` — reads document content and extracts structured data via LLM
- [ ] Type templates for 4 MVP types (Timeline, Comparison, Stats Dashboard, Key Takeaways)
- [ ] Style modifier templates for 6 presets
- [ ] Format/dimension mapping (Portrait→1080x1920, Square→1080x1080, Landscape→1920x1080, OG Card→1200x630)
- [ ] Prompts kept under 250 words
- [ ] `pnpm --filter @repo/media typecheck` passes
**Details:** [04-prompt-builder.md](./tasks/04-prompt-builder.md)

---

### Task 05: Queue Job Type + Worker
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/use-case.md`
**Acceptance Criteria:**
- [ ] `'generate-infographic'` in `JobType` union in `packages/queue/src/types.ts`
- [ ] `GenerateInfographicPayload` and `GenerateInfographicResult` interfaces
- [ ] `createInfographicWorker` in `apps/server/src/workers/infographic-worker.ts`
- [ ] Worker pipeline: fetch infographic → (optionally) extract doc content via LLM → build prompt → call ImageGen → upload to Storage → create version → update infographic status → prune old versions (>10)
- [ ] `onJobComplete` emits SSE events (`infographic_job_completion` + `entity_change`)
- [ ] Resource cleanup: if storage upload succeeds but DB insert fails, delete uploaded image
- [ ] Safety filter handling: catch `ImageGenContentFilteredError`, set status to `failed` with friendly message
- [ ] Worker registered in `apps/server/src/workers/index.ts`
- [ ] `pnpm typecheck` passes
**Details:** [05-worker.md](./tasks/05-worker.md)

---

### Task 06: SSE Events + API Contract + Router
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/router-handler.md`, `standards/patterns/serialization.md`
**Acceptance Criteria:**
- [ ] `'infographic'` added to `EntityType` in events contract
- [ ] `InfographicJobCompletionEvent` type + schema in SSE union
- [ ] `infographicContract` in `packages/api/src/contracts/infographics.ts`: list, get, create, update, delete, generate, getVersions
- [ ] Contract wired into `packages/api/src/contracts/index.ts`
- [ ] `infographicRouter` in `packages/api/src/server/router/infographics.ts` with `handleEffectWithProtocol`
- [ ] Router wired into `packages/api/src/server/router/index.ts`
- [ ] Effect-based serializers used in handlers
- [ ] `pnpm --filter @repo/api typecheck` passes
**Details:** [06-api-contract-router.md](./tasks/06-api-contract-router.md)

---

### Task 07: Frontend Routes + List Page
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`, `standards/frontend/data-fetching.md`, `standards/frontend/styling.md`
**Acceptance Criteria:**
- [ ] Infographics NavLink in sidebar with icon + gradient colors
- [ ] Route files: `infographics/index.tsx` (list), `infographics/$infographicId.tsx` (workbench)
- [ ] Both routes have `loader` with `queryClient.ensureQueryData`
- [ ] `InfographicListContainer` + `InfographicList` container/presenter split
- [ ] Card grid with thumbnail, title, type badge, format badge, date
- [ ] Create button → creates metadata → navigates to workbench
- [ ] Delete with `ConfirmationDialog`
- [ ] `document.title` set, all elements keyboard accessible with aria-labels
- [ ] `pnpm --filter web typecheck` passes
**Details:** [07-frontend-routes-list.md](./tasks/07-frontend-routes-list.md)

---

### Task 08: Infographic Workbench UI
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/frontend/components.md`, `standards/frontend/mutations.md`, `standards/frontend/forms.md`
**Acceptance Criteria:**
- [ ] `InfographicWorkbenchProvider` context: state (prompt, type, style, format, selectedVersion, generationStatus), actions (setPrompt, generate, selectVersion, save), meta (isGenerating, isSaving)
- [ ] LEFT PANEL: prompt textarea, type selector (4 radio), style selector (6 presets), format selector (4 options), source document dropdown, Generate button
- [ ] RIGHT PANEL: image preview (empty state / loading / generated image)
- [ ] BOTTOM: version history strip with thumbnail cards (max 10), click to select
- [ ] TOP BAR: editable title, export/download PNG button
- [ ] `useInfographicActions` hook for mutations
- [ ] SSE handler in `sse-handlers.ts` for infographic events → cache invalidation
- [ ] No god components (>300 lines), focused sub-components
- [ ] All form elements labeled, keyboard nav, WCAG 2.1
- [ ] `pnpm --filter web typecheck && pnpm --filter web build` passes
**Details:** [08-workbench-ui.md](./tasks/08-workbench-ui.md)

---

### Task 09: Tests
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/testing/use-case-tests.md`, `standards/testing/integration-tests.md`, `standards/frontend/testing.md`
**Acceptance Criteria:**
- [ ] `createMockInfographicRepo(overrides)` in `packages/media/src/test-utils/`
- [ ] Unit tests for all use cases (create, get, list, update, delete, generate, get-versions)
- [ ] Unit tests for prompt builder (each type, each style, document extraction)
- [ ] Unit test for ImageGen provider error mapping
- [ ] Frontend tests for InfographicList (renders items, delete confirmation)
- [ ] Frontend tests for workbench (prompt input, generate states, version selection)
- [ ] Tests use `withTestUser`, typed factories — no `as any`
- [ ] `pnpm test` passes (excluding pre-existing failures)
**Details:** [09-tests.md](./tasks/09-tests.md)

---

### Task 99: Final Verification
**Status:** ⏳ NOT_STARTED
**Standards:** All standards referenced in prior tasks
**Acceptance Criteria:**
- [ ] All prior tasks verified by subagent review
- [ ] No standards violations found
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes
- [ ] No `console.log` in production code
- [ ] No `as any` or `as unknown as` casts
- [ ] All mutations check ownership
- [ ] All routes have loaders
- [ ] All interactive elements have aria-labels
- [ ] All delete actions have confirmation dialogs
**Details:** [99-final-verification.md](./tasks/99-final-verification.md)

---

## Success Criteria

- [ ] **Task 01**: DB schema passes typecheck, migration generated
- [ ] **Task 02**: ImageGen service compiles, provider connects to Gemini
- [ ] **Task 03**: All CRUD + generate use cases pass typecheck with auth checks
- [ ] **Task 04**: Prompt builder produces structured prompts for 4 types x 6 styles
- [ ] **Task 05**: Worker processes generate-infographic jobs end-to-end
- [ ] **Task 06**: API contract + router wired, endpoints callable
- [ ] **Task 07**: Infographic list page renders, navigation works
- [ ] **Task 08**: Full workbench: prompt → generate → preview → version history
- [ ] **Task 09**: Comprehensive test coverage, all passing
- [ ] **Task 99**: Full validation passes, no standards violations

Each task maintains working functionality with passing build.

---

## Standards Reference

- `standards/patterns/repository.md` — Context.Tag + Layer, withDb
- `standards/patterns/use-case.md` — Effect.gen, getCurrentUser, withSpan
- `standards/patterns/error-handling.md` — Schema.TaggedError + HTTP protocol
- `standards/patterns/router-handler.md` — handleEffectWithProtocol, contracts
- `standards/patterns/serialization.md` — Effect-based serializers
- `standards/frontend/components.md` — Container/Presenter, no god components
- `standards/frontend/data-fetching.md` — Route loaders, useSuspenseQuery
- `standards/frontend/mutations.md` — useXxxActions hooks, optimistic updates
- `standards/frontend/forms.md` — Form patterns, aria-describedby
- `standards/frontend/styling.md` — Tailwind, Radix UI primitives
- `standards/frontend/testing.md` — Component test patterns
- `standards/testing/use-case-tests.md` — Effect test patterns, withTestUser
- `standards/testing/integration-tests.md` — Integration test patterns
