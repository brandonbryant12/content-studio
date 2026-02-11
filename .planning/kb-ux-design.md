# Knowledge Base UX Design Specification

## 1. Navigation & Information Architecture

### Sidebar Navigation Change

The current "Documents" nav item transforms into "Knowledge Base":

```
Before:                          After:
- Dashboard                      - Dashboard
- Documents      (FileTextIcon)  - Knowledge Base (ReaderIcon or similar)
- Podcasts                       - Podcasts
- Voiceovers                     - Voiceovers
- Infographics                   - Infographics
```

- **Icon**: Replace `FileTextIcon` with a library/book icon (Radix `ReaderIcon` or a custom book-stack icon) to signal broader scope than just files.
- **Color**: Keep `sky-500` family to maintain visual continuity with the existing Documents section.
- **Route**: `/knowledge-base` (replaces `/documents`). Old `/documents` route redirects to `/knowledge-base` for bookmarks.
- **Sidebar tooltip** (collapsed): "Knowledge Base"

### Dashboard Section Update

The "Documents" card and "Recent Documents" section on the dashboard rename to "Knowledge Base" / "Sources". The stat card shows total source count across all types (files, URLs, research). The "Recent" section shows the most recently added sources regardless of type, with a type indicator badge on each item.

---

## 2. Main List View: `/knowledge-base`

### Page Header

```
Eyebrow:  Source Content
Title:    Knowledge Base
```

Action buttons in the header (right side):
- **"+ Add Source"** (primary button) -- opens the Add Source dialog (see Section 4)

### Toolbar Row

Below the header, a single toolbar row contains:

1. **Search input** (left) -- searches across title and URL/topic for all source types
2. **Filter dropdown** (right of search) -- filter by source type:
   - All Types (default)
   - File Upload
   - URL
   - Deep Research
3. **Sort dropdown** (far right) -- sort by:
   - Newest first (default)
   - Oldest first
   - Name A-Z
   - Name Z-A
   - Word count (high to low)

### List Layout

Keep the **table layout** from the current document list (consistent with the existing pattern), with updated columns:

| Checkbox | Title + Icon | Source Type | Words | Size | Created | Actions |
|----------|-------------|-------------|-------|------|---------|---------|

Column changes from current:
- **Source Type** column shows a badge: `FILE`, `URL`, or `RESEARCH` instead of file extension badges
- **Icon** changes per type:
  - File uploads: keep current `DocumentIcon` behavior (PDF = red, DOCX = blue, etc.)
  - URL sources: globe/link icon in `indigo` color
  - Deep Research: magnifying-glass or brain icon in `purple` color
- **Size** column: shows file size for uploads, "-" for URLs, shows word count for research
- The file extension badge (PDF, DOCX, etc.) moves into a secondary indicator within the Source Type column for file uploads

### Row Interactions

- **Click row**: navigate to detail view (`/knowledge-base/$sourceId`)
- **Hover**: show delete icon button (existing pattern)
- **Checkbox**: select for bulk actions (existing pattern)
- **Bulk action bar**: appears at bottom when items selected, offers "Delete Selected" (existing `BulkActionBar` component)

### Empty State

When no sources exist:

```
[Book stack icon]
No sources yet
Add files, URLs, or research topics to build your knowledge base.
[+ Add Source] button
```

When search/filter yields no results:

```
[Search icon]
No sources found
Try adjusting your search or filters.
```

### Loading State

Reuse the existing spinner-in-center pattern from `DocumentListContainer`.

---

## 3. Detail/Preview View: `/knowledge-base/$sourceId`

The detail view uses the existing **workbench layout** pattern (header bar + scroll area) from `DocumentDetail`, adapted per source type.

### Common Header Elements

All source types share:
- **Back button** (left arrow) linking to `/knowledge-base`
- **Source icon** (type-specific, colored)
- **Editable title** input
- **Search in content** button (magnifying glass, toggles search bar)
- **Delete** button (trash icon, with confirmation dialog)
- **Metadata bar**: source type badge, word count, creation date, size (if applicable)

### File Upload Detail

Identical to current `DocumentDetail` -- rendered text content with paragraph-level search highlighting.

### URL Source Detail

- **Metadata bar** includes: URL badge, word count, original URL (clickable, opens in new tab), scrape date
- **Content area**: rendered extracted text (same paragraph-based reader as files)
- **Info callout** at top (subtle, muted background):
  ```
  Scraped from [example.com/article-title] on Jan 15, 2026
  ```

### Deep Research Detail

- **Metadata bar** includes: Research badge, word count, topic, creation date, research duration
- **Content area**: rendered research output (same paragraph-based reader)
- **Research metadata section** (collapsible, above content):
  - Original topic/query
  - Number of sources consulted
  - Research depth setting used
  - Timestamp completed

### Unsaved Changes Bar

Same pattern as current -- appears at bottom when title is edited, with Discard/Save buttons.

---

## 4. Add Source Dialog (Unified Entry Point)

The **"+ Add Source"** button opens a dialog with three tabs. This replaces the current `UploadDocumentDialog` with a broader multi-tab dialog.

### Dialog Structure

```
+------------------------------------------+
|  Add to Knowledge Base                    |
|  Choose how to add source content.        |
|                                           |
|  [Upload File]  [From URL]  [Research]    |
|  ----------------------------------------|
|                                           |
|  (Tab content area)                       |
|                                           |
|  ----------------------------------------|
|  [Cancel]                       [Action]  |
+------------------------------------------+
```

- **Dialog width**: `sm:max-w-lg` (slightly wider than current upload dialog to accommodate URL/research forms)
- **Tab bar**: three tabs using the existing setup wizard tab pattern (button-based, `role="tablist"`)

### Tab 1: Upload File

Nearly identical to current `UploadDocumentDialog` content:

1. **Drop zone** -- drag-and-drop or click to browse
   - Supported: TXT, PDF, DOCX, PPTX
   - Max 10MB
   - Shows selected file name + size when chosen
2. **Title input** (optional) -- auto-filled from filename
3. **Footer**: Cancel + "Upload" button
4. **Loading**: spinner in Upload button, disabled state
5. **Success**: dialog closes, toast "Source added", list refreshes with new item
6. **Error**: toast with error message

### Tab 2: From URL

1. **URL input** (required)
   - Placeholder: "https://example.com/article"
   - Validates URL format on blur
   - `type="url"` for mobile keyboard
2. **Title input** (optional)
   - Placeholder: "Source title (auto-detected if empty)"
3. **Footer**: Cancel + "Add URL" button
4. **On submit**:
   - Button shows spinner + "Scraping..."
   - Backend fetches URL content, extracts text
   - On success: dialog closes, toast "Source added", list refreshes
   - On error: inline error message below URL input ("Could not access this URL. Check the address and try again.")

### Tab 3: Deep Research

1. **Topic input** (required, textarea)
   - Placeholder: "What topic would you like to research?"
   - Rows: 3
   - Character guidance: "Be specific. Example: 'Recent advances in CRISPR gene editing for treating sickle cell disease'"
2. **Research depth** (select dropdown)
   - Quick (2-3 sources, ~1 minute)
   - Standard (5-8 sources, ~3 minutes) -- default
   - Deep (10-15 sources, ~8 minutes)
3. **Title input** (optional)
   - Placeholder: "Research title (auto-generated if empty)"
4. **Footer**: Cancel + "Start Research" button
5. **On submit**:
   - Dialog closes immediately
   - Toast: "Research started -- we'll notify you when it's ready"
   - New item appears in the list with `processing` status (see Section 5)
   - SSE delivers progress updates

---

## 5. Processing & Progress States

### List View Status Indicators

Items that are still processing show an inline status instead of the word count:

| State | List Display |
|-------|-------------|
| `ready` | Normal row (word count, size, etc.) |
| `processing` | Pulsing dot + "Processing..." in the word count column |
| `researching` | Pulsing dot + "Researching..." with optional progress like "3 of 8 sources" |
| `error` | Red warning icon + "Failed" -- clickable to see error details |

### Detail View for Processing Items

If a user clicks a processing item:
- Show the header with title and type
- Content area shows a centered progress indicator:

```
[Spinner]
Researching your topic...
Analyzed 3 of 8 sources

[Estimated time remaining: ~2 minutes]
```

For URL scraping (shorter):
```
[Spinner]
Fetching content from example.com...
```

### SSE Integration

Processing updates arrive via the existing SSE infrastructure (`ssePublisher`). Events:

- `source.processing.progress` -- updates progress text in list and detail
- `source.processing.complete` -- triggers cache invalidation, item transitions to `ready`
- `source.processing.error` -- shows error state with message

The frontend `sse-handlers.ts` handles these events by invalidating the knowledge base list query and optionally the detail query if the user is viewing that item.

### Error Recovery

When an item is in error state:
- List row shows red indicator + "Failed"
- Clicking opens detail view which shows:
  ```
  [Warning icon]
  This source failed to process.

  Error: Could not extract text from the PDF. The file may be image-based or corrupted.

  [Retry]  [Delete]
  ```
- **Retry** re-submits the processing job
- **Delete** removes the failed item (with confirmation)

---

## 6. Organization & Management

### No Folders or Tags (V1)

V1 keeps a **flat list** with search + type filtering. This matches the current Documents UX and avoids premature complexity. Organization features (collections, tags) can be added in V2 based on user feedback once knowledge bases grow large enough to need them.

### Search

- Client-side filtering by title (existing pattern)
- Searches across: title, original URL (for URL sources), topic (for research sources)

### Filter by Type

Single-select dropdown filter:
- All Types
- File Upload
- URL
- Deep Research

Filtering is client-side on the already-fetched list.

### Sort Options

Dropdown with options:
- Newest first (default)
- Oldest first
- Name A-Z
- Name Z-A
- Word count

Sorting is client-side.

### Bulk Actions

Reuse existing `BulkActionBar` and `useBulkSelection`:
- Select individual items via checkbox
- Select all via header checkbox
- "Delete Selected" in the bulk bar
- Confirmation dialog for bulk delete

---

## 7. Integration with Content Creation

### Podcast Setup Wizard (Step 1: Add Source Documents)

The existing `StepDocuments` component currently shows a "Select Existing" / "Upload New" tab pair. This expands:

**Updated tabs:**
- "Select Existing" -- shows all knowledge base items (files, URLs, research) instead of just uploaded documents
- "Upload New" -- unchanged, quick inline upload
- "Add URL" -- quick inline URL scrape (same form as dialog Tab 2)

The document grid in "Select Existing" gains type indicator badges (FILE, URL, RESEARCH) on each item so users can distinguish source types.

### Podcast Workbench Document Manager

The existing `DocumentManager` / `AddDocumentDialog` in the workbench similarly expands. The `ExistingDocumentPicker` shows all knowledge base items. The "Upload" tab within the workbench dialog remains for quick file additions.

### Voiceover Creation

Voiceovers that reference source content follow the same pattern -- the knowledge base picker replaces the document picker.

### Knowledge Context Display

When viewing a podcast/voiceover that references knowledge base items:
- Source items show their type badge
- URL sources show the original URL as a subtle link
- Research sources show the topic summary

---

## 8. Component Hierarchy

### Route Files

```
routes/_protected/knowledge-base/
  index.tsx                         -- /knowledge-base list page
  $sourceId.tsx                     -- /knowledge-base/:id detail page
```

### Feature Module

```
features/knowledge-base/
  components/
    index.ts
    kb-list-container.tsx           -- Container: fetches list, manages state
    kb-list.tsx                     -- Presenter: table with search/filter/sort
    kb-item.tsx                     -- Presenter: table row component (replaces document-item)
    kb-icon.tsx                     -- Presenter: type-specific icon (extends document-icon)
    kb-detail-container.tsx         -- Container: fetches source + content
    kb-detail.tsx                   -- Presenter: content reader view
    kb-detail-header.tsx            -- Presenter: detail header with actions
    kb-processing-view.tsx          -- Presenter: progress/error state for processing items
    add-source-dialog.tsx           -- Presenter: multi-tab dialog (upload/url/research)
    add-source-upload-tab.tsx       -- Presenter: file upload tab content
    add-source-url-tab.tsx          -- Presenter: URL input tab content
    add-source-research-tab.tsx     -- Presenter: research config tab content
    kb-type-badge.tsx               -- Presenter: FILE/URL/RESEARCH badge
    kb-filter-toolbar.tsx           -- Presenter: search + filter + sort bar
  hooks/
    index.ts
    use-kb-list.ts                  -- Data fetching: list query
    use-kb-item.ts                  -- Data fetching: single item query
    use-kb-content.ts               -- Data fetching: item content query
    use-kb-actions.ts               -- Mutations: delete, retry, rename
    use-kb-upload.ts                -- Mutation: file upload with optimistic update
    use-kb-add-url.ts               -- Mutation: URL scrape submission
    use-kb-start-research.ts        -- Mutation: research job submission
    use-optimistic-delete-kb.ts     -- Mutation: optimistic delete
    use-kb-search.ts                -- In-content search (existing document search adapted)
    use-kb-filters.ts               -- Local state: search query, type filter, sort
  __tests__/
    handlers.ts                     -- MSW handlers for tests
    kb-list.test.tsx                -- List component tests
  index.ts                          -- Public exports
```

### Container/Presenter Split

| Container | Presenter(s) | Responsibilities |
|-----------|-------------|------------------|
| `KbListContainer` | `KbList`, `KbItem`, `KbFilterToolbar`, `KbTypeBadge` | List fetching, delete orchestration, bulk selection, filter state |
| `KbDetailContainer` | `KbDetail`, `KbDetailHeader`, `KbProcessingView` | Item + content fetching, title editing, save/delete actions, search |
| (inline in `KbList`) | `AddSourceDialog` + tab sub-components | Upload/URL/research submission |

### Shared Components Used

From `shared/components/`:
- `ConfirmationDialog` -- delete confirmations
- `BulkActionBar` -- bulk delete bar
- `SuspenseBoundary` -- Suspense wrapper in route
- `ErrorBoundary` -- error handling

From `@repo/ui/components/`:
- `Button`, `Input`, `Dialog`, `Select`, `Checkbox`, `Spinner`, `Badge`, `Tabs`, `Label`, `Textarea`, `Tooltip`

### New Shared Components (if needed)

- None required for V1. The `AddSourceDialog` is feature-specific. The `KbTypeBadge` may move to shared if the podcast/voiceover creation flows need it, but start in the feature module.

---

## 9. Dialog Components Summary

| Dialog | Trigger | Content | Existing? |
|--------|---------|---------|-----------|
| `AddSourceDialog` | "+ Add Source" button in list header | Three-tab form (Upload/URL/Research) | New (replaces `UploadDocumentDialog`) |
| `ConfirmationDialog` | Delete button (single + bulk) | "Are you sure?" with destructive styling | Existing |

---

## 10. Keyboard Shortcuts

Preserve existing shortcuts and add:
- `Cmd+F` in detail view -- toggle content search (existing)
- `Cmd+S` in detail view -- save title changes (existing)
- No new global shortcuts needed for V1

---

## 11. Accessibility Requirements

Per WCAG 2.1 Level A and existing project standards:

- Every icon button has `aria-label`
- Every input has a visible label or `aria-label`
- Tab panels use proper `role="tablist"` / `role="tab"` / `role="tabpanel"` ARIA
- Type filter and sort dropdowns are Radix `Select` with proper keyboard navigation
- Processing status updates use `aria-live="polite"` region
- Each page sets `document.title` ("Knowledge Base - Content Studio", "[Source Title] - Content Studio")
- Focus management: dialog traps focus, closing returns focus to trigger
- Search result count announced to screen readers ("3 of 12 matches")
- Bulk action bar keyboard accessible

---

## 12. Responsive Behavior

Follows existing responsive patterns:

- **Mobile (<640px)**: Hide Size and Created columns in table (existing `hidden sm:table-cell` / `hidden md:table-cell` pattern). Search, filter, and sort stack vertically if needed.
- **Tablet (640-1024px)**: Full table with all columns visible.
- **Desktop (>1024px)**: Full layout, comfortable spacing.

The Add Source dialog is responsive via `sm:max-w-lg` (same pattern as current upload dialog).

---

## 13. Migration Path

### Phase 1: Rename + Restructure
- Rename sidebar nav: Documents -> Knowledge Base
- Create `features/knowledge-base/` module
- Move document components/hooks into KB feature (or re-export to avoid breaking existing podcast integration)
- Route: `/knowledge-base` with redirect from `/documents`
- Dashboard: rename section to "Knowledge Base"

### Phase 2: URL Sources
- Add URL tab to `AddSourceDialog`
- Backend: URL scraping use case + storage
- List view: show URL-type items with globe icon and URL badge
- Detail view: show scraped content with source URL callout

### Phase 3: Deep Research
- Add Research tab to `AddSourceDialog`
- Backend: research job orchestration (LLM multi-step)
- SSE progress events for research jobs
- Processing states in list and detail views
- Detail view: show research output with metadata section

### Phase 4: Creation Flow Integration
- Update podcast `StepDocuments` to show all KB source types
- Update workbench `ExistingDocumentPicker` to show all KB source types
- Add type badges to source items in creation flows

---

## 14. Visual Reference: State Matrix

| Source Type | List Icon | List Badge | Detail Header | Processing? |
|-------------|-----------|------------|---------------|-------------|
| File (PDF) | Red file icon | `FILE` sky | File icon + extension badge | Brief (extraction) |
| File (DOCX) | Blue file icon | `FILE` sky | File icon + extension badge | Brief (extraction) |
| File (TXT) | Blue file icon | `FILE` sky | File icon + extension badge | None |
| URL | Globe icon (indigo) | `URL` indigo | Globe icon + URL link | Medium (scraping) |
| Research | Brain/search icon (purple) | `RESEARCH` purple | Brain icon + topic | Long (minutes) |

---

## 15. Open Questions for Product Review

1. **Research depth pricing**: Should deep research cost more (credit system)? If so, the research tab needs a cost indicator.
2. **Re-scrape URLs**: Should users be able to re-scrape a URL to get updated content? If yes, add a "Refresh" button to URL source detail views.
3. **Research editing**: After research completes, can users edit the output text? The current document detail allows title editing only, not content editing. Research outputs may benefit from being editable.
4. **Source deduplication**: Should the system warn if a URL has already been scraped? What about near-duplicate file uploads?
5. **Collection/tagging (V2)**: When does the flat list become unwieldy enough to need organization? Track usage to decide priority.
