# Knowledge Base — Implementation Plan

> Consolidated from: Platform Research, Codebase Analysis, UX Design, Technical Architecture
> Date: 2026-02-11

---

## Executive Summary

Transform the existing **Documents** feature into a **Knowledge Base** — a unified content hub where users can upload files, scrape web URLs, and run AI-powered deep research. All three source types produce the same artifact (a document with extracted text) that feeds into podcast, voiceover, and infographic generation.

The design is **additive, not a rewrite**. We extend the existing `document` table with new columns and source types. Downstream entities (`podcast.sourceDocumentIds`, `infographic.sourceDocumentIds`) continue to work with zero changes. Background jobs handle the async operations (URL scraping, deep research), with SSE events pushing real-time progress to the frontend.

---

## Key Insights from Research

### What Users Expect (Table Stakes)
- Multi-format file upload (PDF, DOCX, TXT, PPTX) — **already supported**
- URL/web content import — **new**
- Search across all knowledge items
- Source type badges to distinguish file vs URL vs research
- Processing status indicators for async operations
- Retry for failed operations

### Competitive Differentiators Worth Pursuing
- **Deep Research integration** — only NotebookLM, ChatGPT, and Perplexity offer this; none integrate it directly into a content creation pipeline
- **Source-grounded content generation** — NotebookLM's inline citations are the gold standard
- **Research-to-podcast pipeline** — unique to Content Studio: research a topic -> knowledge base -> generate podcast

### What to Defer (V2+)
- Folders/tags/collections (keep flat list for V1, add when users have enough items to need organization)
- Vector embeddings / RAG (start with full-text injection, the existing pattern)
- Auto-refresh URLs on a schedule
- YouTube transcript extraction
- Collaborative/shared knowledge bases

---

## Phased Implementation Roadmap

### Phase 1: Rename + Schema Extension + Backend Foundation
**Goal**: Database ready, backend plumbing in place, UI renamed but functionally identical.

#### 1.1 Database Schema Changes
**File**: `packages/db/src/schemas/documents.ts`

- Extend `documentSourceEnum` with `'url'` and `'research'` values
- Create `documentStatusEnum`: `'ready' | 'processing' | 'failed'`
- Add columns to `document` table:
  - `status` (document_status, NOT NULL, default `'ready'`)
  - `errorMessage` (text, nullable)
  - `sourceUrl` (text, nullable)
  - `researchConfig` (jsonb, nullable) — stores `{ query, operationId, researchStatus, sourceCount }`
  - `jobId` (varchar(20), nullable)
  - `extractedText` (text, nullable) — denormalized for fast prompt injection
  - `contentHash` (text, nullable) — for dedup/cache invalidation
- Add indexes on `status` and `sourceUrl`
- Add companion constants: `DocumentSource`, `DocumentStatus`
- Update `DocumentOutputSchema` to include `status`, `errorMessage`, `sourceUrl`

**Migration**: Fully backwards-compatible. Existing rows get `status = 'ready'`, all new columns nullable.

#### 1.2 Job Types
**File**: `packages/db/src/schemas/jobs.ts` (or queue types)

- Add `'process-url'` and `'process-research'` job types
- Define `ProcessUrlPayload` and `ProcessResearchPayload` interfaces

#### 1.3 Domain Layer — New Error Types
**File**: `packages/media/src/errors.ts`

| Error | Tag | HTTP | When |
|-------|-----|------|------|
| `UrlFetchError` | `UrlFetchError` | 422 | URL scrape fails |
| `InvalidUrlError` | `InvalidUrlError` | 400 | Malformed URL |
| `DocumentAlreadyProcessing` | `DocumentAlreadyProcessing` | 409 | Retry on non-failed doc |

**File**: `packages/ai/src/errors.ts`

| Error | Tag | HTTP | When |
|-------|-----|------|------|
| `ResearchError` | `ResearchError` | 422 | Gemini API fails |
| `ResearchTimeoutError` | `ResearchTimeoutError` | 504 | Polling exceeds max wait |

#### 1.4 Repository Extensions
**File**: `packages/media/src/document/repos/document-repo.ts`

Add methods:
- `updateStatus(id, status, errorMessage?)` — processing lifecycle
- `updateContent(id, { contentKey, extractedText?, contentHash?, wordCount, metadata? })` — set content after processing
- `findBySourceUrl(url, createdBy)` — URL dedup per user
- `updateResearchConfig(id, config)` — update research metadata

#### 1.5 Optimize `getDocumentContent`
**File**: `packages/media/src/document/use-cases/get-document-content.ts`

- Check `doc.extractedText` first; if present, return it directly (skip storage download + parse)
- Falls back to existing download+parse for legacy file uploads

#### 1.6 Frontend Rename
- Sidebar: "Documents" -> "Knowledge Base" with `ReaderIcon`
- Route: `/documents` -> `/knowledge-base` (add redirect from old route)
- Dashboard: "Documents" card -> "Knowledge Base"
- Page title: "Knowledge Base"
- Move feature module: `features/documents/` -> `features/knowledge-base/` (or create new and deprecate)
- Rename components: `DocumentListContainer` -> `KbListContainer`, etc.
- Add source type badges (`FILE | URL | RESEARCH`) to list view
- Add filter dropdown (All Types / File / URL / Research)
- Add sort dropdown (Newest, Oldest, Name A-Z, Name Z-A, Word count)

**No new functionality yet** — just the rename, badges (only `FILE` shown for now), and filter/sort UI.

---

### Phase 2: URL Scraping

#### 2.1 URL Scraper Service
**New file**: `packages/media/src/document/services/url-scraper.ts`

- `UrlScraper` Context.Tag with `fetchAndExtract(url)` method
- Returns `ScrapedContent { title, content, description, author, publishedAt, wordCount }`

**New file**: `packages/media/src/document/services/url-scraper-impl.ts`

- Use `@extractus/article-extractor` (or `mozilla/readability` + `jsdom` as fallback)
- Fetch with 30s timeout, 5MB response size limit
- SSRF protection: reject `localhost`, private IPs, non-HTTP(S) schemes
- HTML-to-text conversion for clean extracted content

**New dependency**: `@extractus/article-extractor` in `packages/media/package.json`

#### 2.2 URL Validation
**New file**: `packages/media/src/document/services/url-validator.ts`

- `validateUrl(url)` — schema validation, SSRF protection, scheme check
- Reject private/internal IPs, non-HTTP(S), suspiciously long URLs

#### 2.3 New Use Case: `createFromUrl`
**New file**: `packages/media/src/document/use-cases/create-from-url.ts`

Flow:
1. Validate URL format + safety
2. Check for duplicate URL for this user (return existing if `ready`)
3. Insert document row with `status: 'processing'`, `source: 'url'`, `sourceUrl`
4. Enqueue `process-url` job
5. Return the processing document immediately

#### 2.4 Background Worker: URL Processing
**New file**: `apps/server/src/workers/knowledge-worker.ts`
**New file**: `apps/server/src/workers/knowledge-handlers.ts`

`handleProcessUrl` job handler:
1. Call `urlScraper.fetchAndExtract(url)` (with 3 retries, exponential backoff)
2. Upload extracted text to storage: `documents/{docId}/content.txt`
3. Compute content hash
4. Update document: `contentKey`, `extractedText` (if < 100KB), `contentHash`, `wordCount`, metadata
5. Auto-detect title from scraped page if title was URL-derived
6. Set `status: 'ready'`
7. On failure: set `status: 'failed'`, `errorMessage`
8. Publish SSE event: `document_processing` with status

Register worker in `apps/server/src/workers/index.ts`.

#### 2.5 SSE Events
**File**: `packages/api/src/contracts/events.ts`

Add `DocumentProcessingEvent` type:
```typescript
{ type: 'document_processing', documentId, status, progress?, errorMessage?, userId, timestamp }
```

#### 2.6 API Endpoints
**File**: `packages/api/src/contracts/documents.ts`

- `POST /documents/from-url` — input: `{ url, title?, metadata? }`, output: `DocumentOutputSchema`
- `POST /documents/{id}/retry` — input: `{ id }`, output: `DocumentOutputSchema`
- Update `list` input to accept optional `source` and `status` filters

**File**: `packages/api/src/server/router/document.ts`

- Add `fromUrl` handler, `retry` handler
- Update `list` handler to pass filters to use case

#### 2.7 Frontend: Add Source Dialog
**New file**: `features/knowledge-base/components/add-source-dialog.tsx`

Replace `UploadDocumentDialog` with a three-tab dialog:
- **Tab 1: Upload File** — existing upload UI, moved into tab
- **Tab 2: From URL** — URL input + optional title + "Add URL" button
- Tab 3: Research — disabled/hidden until Phase 3

#### 2.8 Frontend: Processing States
- List view: processing items show pulsing indicator + "Processing..." instead of word count
- Failed items show red indicator + "Failed"
- SSE handler invalidates `knowledge-base.list` query on `document_processing` events
- Detail view for processing item: centered spinner with status text
- Detail view for failed item: error message + Retry button + Delete button

#### 2.9 Frontend: URL Source Detail
- Info callout: "Scraped from [url] on [date]"
- Rest of detail view identical to file sources (content reader with search)

---

### Phase 3: Deep Research

#### 3.1 Deep Research Service
**New file**: `packages/ai/src/research/service.ts`

- `DeepResearch` Context.Tag with:
  - `startResearch(query)` -> `{ operationId }`
  - `getResearchResult(operationId)` -> `ResearchResult | null`

**New file**: `packages/ai/src/research/providers/google.ts`

- Gemini Deep Research API integration via direct HTTP (or Vercel AI SDK if supported)
- Background mode: fire and poll
- If Deep Research API unavailable: fallback to Gemini with Google Search grounding tool

#### 3.2 New Use Case: `createFromResearch`
**New file**: `packages/media/src/document/use-cases/create-from-research.ts`

Flow:
1. Insert document with `status: 'processing'`, `source: 'research'`, `researchConfig: { query }`
2. Enqueue `process-research` job
3. Return processing document immediately (dialog closes, toast: "Research started")

#### 3.3 Background Worker: Research Processing
Add `handleProcessResearch` to `knowledge-handlers.ts`:

1. Call `deepResearch.startResearch(query)` -> get `operationId`
2. Update `researchConfig` with `operationId`
3. Poll with exponential backoff (2s -> 4s -> 8s -> ... -> 30s cap, max ~10 min)
4. Publish SSE progress events during polling
5. On completion: store content, update document, set `status: 'ready'`
6. On failure: set `status: 'failed'`, update `researchConfig.researchStatus`

#### 3.4 API Endpoint
**File**: `packages/api/src/contracts/documents.ts`

- `POST /documents/from-research` — input: `{ query, title? }`, output: `DocumentOutputSchema`

#### 3.5 Frontend: Research Tab
- Enable Tab 3 in `AddSourceDialog`
- Topic textarea + optional title
- "Start Research" button -> closes dialog, shows toast
- List view shows "Researching..." with optional progress ("3 of 8 sources")

#### 3.6 Frontend: Research Detail
- Research metadata section (collapsible): topic, source count, duration, depth
- Sources list (if returned by API): links to consulted web pages
- Content rendered same as other source types

---

### Phase 4: Polish & Integration

#### 4.1 Content Creation Flow Integration
- Update `StepDocuments` (podcast setup) to show all KB source types with type badges
- Update `ExistingDocumentPicker` to display type indicators
- Update `DocumentContentViewer` to show source metadata (URL, research topic)
- Update shared `AddDocumentDialog` tabs: "Select Existing" shows all KB items

#### 4.2 Performance Optimizations
- Content truncation utility: `truncateForPrompt(content)` at 100K chars (~25K tokens) for AI injection
- Backfill `extractedText` for existing file uploads (optional migration job)
- Server-side search (Postgres `ILIKE` or `tsvector`) if client-side search becomes slow

#### 4.3 Retry Use Case
**New file**: `packages/media/src/document/use-cases/retry-processing.ts`

- Verify ownership + `status === 'failed'`
- Reset to `processing`, re-enqueue appropriate job type

#### 4.4 Dangling Reference Cleanup
- When deleting a document, also remove its ID from any `podcast.sourceDocumentIds` and `infographic.sourceDocumentIds` arrays
- Or: gracefully handle missing documents in serialization (filter out deleted IDs)

---

## Data Model Summary

### Extended `document` Table

| Column | Type | New? | Description |
|--------|------|------|-------------|
| id | varchar(20) | | PK, `doc_*` branded |
| title | text | | User-facing title |
| contentKey | text | | Storage key for raw/extracted content |
| mimeType | text | | MIME type |
| wordCount | integer | | Word count |
| source | document_source | extended | + `'url'`, `'research'` |
| originalFileName | text | | Original upload filename |
| originalFileSize | integer | | Original file size |
| metadata | jsonb | | Arbitrary metadata |
| **status** | **document_status** | **NEW** | `'ready' \| 'processing' \| 'failed'` |
| **errorMessage** | **text** | **NEW** | Error when status = 'failed' |
| **sourceUrl** | **text** | **NEW** | Source URL for url-type docs |
| **researchConfig** | **jsonb** | **NEW** | `{ query, operationId, researchStatus, sourceCount }` |
| **jobId** | **varchar(20)** | **NEW** | Background job reference |
| **extractedText** | **text** | **NEW** | Denormalized text (< 100KB) |
| **contentHash** | **text** | **NEW** | SHA-256 for dedup/cache |
| createdBy | text | | Owner user ID |
| createdAt | timestamp | | Creation time |
| updatedAt | timestamp | | Update time |

---

## API Endpoints Summary

### Existing (unchanged)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/documents` | List documents (+ new `source`, `status` filters) |
| GET | `/documents/{id}` | Get document |
| GET | `/documents/{id}/content` | Get text content |
| POST | `/documents` | Create from text |
| POST | `/documents/upload` | Upload file |
| PATCH | `/documents/{id}` | Update title/content |
| DELETE | `/documents/{id}` | Delete |

### New
| Method | Path | Phase | Description |
|--------|------|-------|-------------|
| POST | `/documents/from-url` | 2 | Create from URL (async scrape) |
| POST | `/documents/from-research` | 3 | Start deep research (async) |
| POST | `/documents/{id}/retry` | 2 | Retry failed processing |

---

## Frontend Component Plan

### Feature Module: `features/knowledge-base/`

```
components/
  kb-list-container.tsx          # Container: list fetching, state management
  kb-list.tsx                    # Presenter: table with search/filter/sort
  kb-item.tsx                    # Presenter: table row
  kb-icon.tsx                    # Presenter: type-specific icon
  kb-detail-container.tsx        # Container: detail fetching, actions
  kb-detail.tsx                  # Presenter: content reader
  kb-detail-header.tsx           # Presenter: header bar with actions
  kb-processing-view.tsx         # Presenter: progress/error for processing items
  add-source-dialog.tsx          # Multi-tab dialog (Upload/URL/Research)
  add-source-upload-tab.tsx      # File upload tab
  add-source-url-tab.tsx         # URL input tab
  add-source-research-tab.tsx    # Research config tab
  kb-type-badge.tsx              # FILE/URL/RESEARCH badge
  kb-filter-toolbar.tsx          # Search + filter + sort bar
hooks/
  use-kb-list.ts                 # List query
  use-kb-item.ts                 # Single item query
  use-kb-content.ts              # Content query
  use-kb-actions.ts              # Delete, retry, rename mutations
  use-kb-upload.ts               # File upload mutation
  use-kb-add-url.ts              # URL scrape mutation
  use-kb-start-research.ts       # Research mutation
  use-optimistic-delete-kb.ts    # Optimistic delete
  use-kb-search.ts               # In-content search
  use-kb-filters.ts              # Filter/sort state
```

### Routes
```
routes/_protected/knowledge-base/
  index.tsx                       # /knowledge-base
  $sourceId.tsx                   # /knowledge-base/:id
```

---

## Background Jobs Summary

| Job Type | Trigger | Duration | Retries | SSE Events |
|----------|---------|----------|---------|------------|
| `process-url` | `POST /from-url` | 5-30s | 3 auto | `document_processing` |
| `process-research` | `POST /from-research` | 1-10 min | 0 auto (user retry) | `document_processing` with progress |

---

## New Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `@extractus/article-extractor` | `packages/media` | URL content extraction |
| (none for AI — use existing Gemini SDK) | `packages/ai` | Deep Research via existing Google AI integration |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Gemini Deep Research API not GA | Phase 3 blocked | Medium | Fallback: Gemini + Google Search grounding tool |
| URL scraping blocked by sites | Degraded UX | Medium | Clear error messages, user can paste content manually |
| Large `extractedText` columns bloat DB | Perf degradation | Low | Cap at 100KB inline; larger content stays in storage only |
| SSRF via URL scraping | Security vulnerability | Medium | URL validator with private IP blocking, scheme whitelist |
| Breaking change to document serialization | Frontend errors | Low | New fields have defaults/nulls; output schema is additive |
| Research API costs spiral | Budget | Medium | Per-user daily quota (e.g., 10 research tasks/day) |

---

## Open Questions for Decision

1. **Research depth selector** — Should we expose Quick/Standard/Deep options to users, or use a single "Standard" setting? (UX simplicity vs. power-user control)

2. **URL re-scraping** — Should users be able to "Refresh" a URL source to get updated content? (Adds `refreshContent` use case + UI button)

3. **Research editing** — After research completes, can users edit the output text? (Currently document content is read-only in the detail view)

4. **Source deduplication** — When a user pastes a URL they've already scraped, should we return the existing item or create a new one? (Current plan: return existing if `ready`, else create new)

5. **Route naming** — `/knowledge-base` vs `/kb` vs keeping `/documents`? (Recommendation: `/knowledge-base` with `/documents` redirect)

6. **Contract naming** — Keep `documents.*` in the API contract or rename to `knowledge.*`? (Recommendation: keep `documents.*` to minimize breaking changes, rename later if desired)

---

## Implementation Effort Estimates

| Phase | Scope | Rough Size |
|-------|-------|------------|
| Phase 1 | Schema + rename + badges | ~20 files, 1-2 days |
| Phase 2 | URL scraping end-to-end | ~25 files, 3-4 days |
| Phase 3 | Deep Research end-to-end | ~15 files, 2-3 days |
| Phase 4 | Polish + integration | ~15 files, 2-3 days |
| **Total** | | **~75 files, 8-12 days** |

---

## Supporting Research Documents

- [Platform Research](kb-platform-research.md) — competitive analysis of 7 platforms
- [Codebase Analysis](kb-codebase-analysis.md) — current Documents feature deep dive
- [UX Design Spec](kb-ux-design.md) — full UX specification with component hierarchy
- [Technical Architecture](kb-technical-architecture.md) — data model, services, jobs, API design
