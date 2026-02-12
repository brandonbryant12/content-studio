# Frontend Audit — All Findings

**Generated**: 2026-02-12
**Scope**: ~200 files across `apps/web/src/`
**Total findings**: 0 critical, 45 important, 121 nice-to-have (166 total)

---

## Wave 1 — Quick Wins (high impact, easy fixes)

### W1-01: Fix `fileToBase64` O(N^2) performance
- **Files**: `features/documents/hooks/use-optimistic-upload.ts:31-39`, `features/podcasts/components/setup/steps/step-documents.tsx:112-121`
- **Issue**: `String.fromCharCode` reduce loop creates N intermediate strings for N-byte file. 10MB file freezes browser.
- **Fix**: Replace with `FileReader.readAsDataURL` (strip prefix):
```ts
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]!);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### W1-02: Add Radix Select `min-width` (2 files)
- **Files**: `features/podcasts/components/workbench/podcast-settings.tsx:117`, `features/admin/components/activity-filters.tsx:64`
- **Issue**: Portaled dropdown renders narrower than trigger. Project standard violation.
- **Fix**: Add `style={{ minWidth: 'var(--radix-select-trigger-width)' }}` and `position="popper"` to `Select.Content`.

### W1-03: Memoize SSE Provider context value
- **File**: `providers/sse-provider.tsx:14-19`
- **Issue**: `{ connectionState, reconnect }` object creates new ref every render, causing all SSE consumers to re-render.
- **Fix**: `const value = useMemo(() => ({ connectionState, reconnect }), [connectionState, reconnect])`

### W1-04: Add `aria-label="Main navigation"` to sidebar nav
- **File**: `routes/_protected/layout.tsx:115`
- **Issue**: Sidebar `<nav>` lacks aria-label, indistinguishable from header nav for screen readers.
- **Fix**: Add `aria-label="Main navigation"` to the `<nav>` element.

### W1-05: Fix `text-red-500` → `text-destructive`
- **File**: `routes/-components/common/form-field-info.tsx:10`
- **Issue**: Hardcoded Tailwind color instead of semantic design token.
- **Fix**: Change `text-red-500` to `text-destructive`.

### W1-06: Extract `--navbar-height` CSS custom property
- **Files**: `routes/__root.tsx:44`, `routes/_protected/layout.tsx:111-113`, `features/infographics/components/infographic-workbench-container.tsx:126`
- **Issue**: Magic `57px` hardcoded in 3+ files.
- **Fix**: Add `--navbar-height: 57px` to `:root` in global CSS, replace all `h-[calc(100vh-57px)]` with `h-[calc(100vh-var(--navbar-height))]`.

### W1-07: Create `useIsAdmin()` hook, remove type assertions
- **Files**: `features/podcasts/components/podcast-detail-container.tsx:50`, `features/voiceovers/components/voiceover-detail-container.tsx:35`, `features/infographics/components/infographic-workbench-container.tsx:42`, `routes/_protected/layout.tsx:255-256`
- **Issue**: `(user as { role?: string })?.role === 'admin'` repeated in 4+ files. Fragile type assertion.
- **Fix**: Create `shared/hooks/use-is-admin.ts` that encapsulates the role check. Import in all containers.

---

## Wave 2 — Deduplication & Dead Code Cleanup

### W2-01: Remove dead files in Podcasts feature
- **Files to remove**:
  - `features/podcasts/components/workbench/smart-actions.tsx` — unused, superseded by GlobalActionBar
  - `features/podcasts/components/workbench/segment-editor-dialog.tsx` — unused, editing is inline
  - `features/podcasts/components/workbench/document-list.tsx` — local copy, shared version used
  - `features/podcasts/components/workbench/collapsible-section.tsx` — unused, similar to prompt-section
  - `features/podcasts/hooks/use-podcast-generation.ts` — superseded by use-podcast-actions
- **Verify**: Check barrel exports (`index.ts`) and remove re-exports too.

### W2-02: Extract shared `formatDate` utility
- **Duplicated in**: `features/documents/components/document-list.tsx:63-69`, `features/documents/components/document-detail.tsx:165-171`, `features/voiceovers/components/voiceover-list.tsx:48-54`
- **Fix**: Add `formatDate` to `shared/lib/formatters.ts` (alongside existing `formatFileSize`). Import in all 3 files.

### W2-03: Extract `getFileLabel`/`getFileBadgeClass` to documents lib
- **Duplicated in**: `features/documents/components/document-list.tsx:22-41`, `features/documents/components/document-item.tsx:24-39`, `features/documents/components/document-detail.tsx`
- **Fix**: Create `features/documents/lib/format.ts` with both functions. Import everywhere.

### W2-04: Extract duplicate `StatusBadge` in voiceovers
- **Duplicated in**: `features/voiceovers/components/voiceover-list.tsx:36-46`, `features/voiceovers/components/voiceover-item.tsx:29-39`
- **Fix**: Create `features/voiceovers/components/status-badge.tsx`. Import in both files.

### W2-05: Centralize admin types
- **Duplicated types**: `Period` (4 files), `ActivityItem` (2 files), `StatBreakdown` (2 files), `TopUser` (2 files)
- **Files**: `features/admin/components/activity-dashboard-container.tsx`, `activity-dashboard.tsx`, `activity-feed.tsx`, `activity-stats.tsx`, `activity-filters.tsx`, `hooks/use-activity-stats.ts`
- **Fix**: Create `features/admin/types.ts`. Derive types from `RouterOutput` where possible.

### W2-06: Extract VOICES to single source
- **Duplicated in**: `features/podcasts/components/setup/steps/step-audio.tsx:8-57`, `features/podcasts/hooks/use-podcast-settings.ts:11-60`
- **Fix**: Keep in `hooks/use-podcast-settings.ts` (already exported), remove from `step-audio.tsx` and import.

### W2-07: Extract SUPPORTED_TYPES/SUPPORTED_EXTENSIONS
- **Duplicated in**: `features/podcasts/components/setup/steps/step-documents.tsx:20-28`, `features/podcasts/components/workbench/document-uploader.tsx:7-14`
- **Fix**: Create `features/podcasts/lib/upload-constants.ts`. Import in both files.

### W2-08: Extract `RecentSection` in dashboard
- **File**: `routes/_protected/dashboard.tsx:44-429`
- **Issue**: 4 nearly identical ~50-line blocks (Documents, Podcasts, Voiceovers, Infographics).
- **Fix**: Extract `RecentSection` component that takes `{ title, icon, iconColor, items, renderItem, emptyMessage, linkTo, isLoading, count }`. Each section becomes ~5 lines.

### W2-09: Rename misleading `useOptimisticCreate` hooks
- **Files**: `features/voiceovers/hooks/use-optimistic-create.ts`, `features/infographics/hooks/use-optimistic-create.ts`
- **Issue**: These don't perform optimistic updates — they're standard mutations with invalidation.
- **Fix**: Rename to `useCreateVoiceover` and `useCreateInfographic`. Update all imports.

### W2-10: Remove dead code exports in admin hooks
- **Files**: `features/admin/hooks/use-activity-list.ts:48-59,65-74`, `features/admin/hooks/use-activity-stats.ts:24-26`
- **Issue**: `useActivityListSimple`, `getActivityListQueryKey`, `getActivityStatsQueryKey` exported but never imported.
- **Fix**: Remove unused exports and their associated unused imports.

### W2-11: De-duplicate sidebar toggle button
- **File**: `routes/_protected/layout.tsx:188-212`
- **Issue**: ~25 lines of duplicated markup — collapsed wraps in Tooltip, expanded doesn't.
- **Fix**: Extract a small `ToggleButton` component, conditionally wrap in `<Tooltip>` when collapsed.

---

## Wave 3 — Deeper Refactors

### W3-01: Fix VoiceoverRow re-render storm
- **File**: `features/voiceovers/components/voiceover-list.tsx:111-259`
- **Issue**: Every row re-renders 1x/second during playback because `quickPlay` object ref changes with `currentTime`.
- **Fix**: Split quickPlay concern. Pass only `isThisPlaying` boolean and `onToggle` callback to each row. Create a separate `PlaybackProgress` component that subscribes to quickPlay time and renders only for the active row.

### W3-02: Simplify `useVoiceoverSettings`
- **File**: `features/voiceovers/hooks/use-voiceover-settings.ts:41-101`
- **Issue**: 7 `useState` calls with render-time conditionals. Complex state sync logic.
- **Fix**: Refactor to `useReducer`. Derive `hasChanges` by comparing current state to server data. Remove manual prev-value tracking.

### W3-03: Simplify `usePodcastSettings`
- **File**: `features/podcasts/hooks/use-podcast-settings.ts:102-285`
- **Issue**: 8 state variables, multiple render-time sync blocks, manual `prevPodcastId` tracking.
- **Fix**: Same approach as W3-02 — `useReducer` with derived `hasChanges`.

### W3-04: Implement roving tabindex in VoiceSelector
- **File**: `features/voiceovers/components/workbench/voice-selector.tsx:96-158`
- **Issue**: Radio group has correct ARIA roles but no arrow key navigation. All items have `tabIndex={0}`.
- **Fix**: Only selected voice gets `tabIndex={0}`, others get `tabIndex={-1}`. Add `onKeyDown` handler for ArrowUp/Down/Left/Right to move selection.

### W3-05: Make document-uploader drop zone keyboard accessible
- **File**: `features/podcasts/components/workbench/document-uploader.tsx:157-180`
- **Issue**: Drop zone div has `onClick` and drag handlers but no `role`, `tabIndex`, or keyboard handler.
- **Fix**: Add `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space triggers click).

### W3-06: Fix prompt viewer Escape key handling
- **File**: `features/podcasts/components/workbench/prompt-viewer/prompt-viewer-panel.tsx:48-55`
- **Issue**: Outer div captures Escape on `onKeyDown` but has no `tabIndex`, so it never receives keyboard events.
- **Fix**: Add `tabIndex={-1}` and auto-focus the panel on mount via `useEffect` + `ref.current?.focus()`.

### W3-07: Fix bulk-delete partial failure rollback
- **File**: `shared/hooks/use-bulk-delete.ts:51-57`
- **Issue**: On partial failure, ALL items reappear including successfully deleted ones.
- **Fix**: On partial failure, only restore items whose deletion failed. Filter `previous` to only include failed item IDs.

### W3-08: Add `aria-valuetext` to audio slider
- **File**: `features/voiceovers/components/workbench/audio-stage.tsx:62-75`
- **Issue**: Progress slider missing `aria-valuetext` for screen readers.
- **Fix**: Add `aria-valuetext={formatTime(currentTime) + ' of ' + formatTime(duration)}`.

### W3-09: Simplify NavItem color props with `cva`
- **File**: `routes/_protected/layout.tsx:56`
- **Issue**: 6 NavItem instances each have ~200-char `color` and `activeColor` Tailwind class strings. Verbose and hard to maintain.
- **Fix**: Create a color config map and use `cva` or utility function to map `colorScheme="sky"` to the full class strings.

### W3-10: Fix `useDocumentActions` server sync
- **File**: `features/documents/hooks/use-document-actions.ts:40-41`
- **Issue**: `useState(document.title)` won't sync from SSE/cache invalidation. Violates `components.md` standard.
- **Fix**: Add `useEffect` that syncs from `document.title` when it changes externally, with `hasUserEdits` guard.

### W3-11: Fix infographic settings inline setState
- **File**: `features/infographics/hooks/use-infographic-settings.ts:114-128`
- **Issue**: Uses inline setState during render. Standards say use `useEffect`.
- **Fix**: Replace render-time state updates with `useEffect` watching server values.

### W3-12: Fix infographic checkbox keyboard accessibility
- **File**: `features/infographics/components/infographic-item.tsx:88-95`
- **Issue**: Checkbox has `tabIndex={-1}`, unreachable via keyboard.
- **Fix**: Remove `tabIndex={-1}` from Checkbox.

### W3-13: Lift ConfirmationDialog in infographic list
- **File**: `features/infographics/components/infographic-item.tsx:75-203`
- **Issue**: Each item renders its own ConfirmationDialog. 50 items = 50 dialog DOM nodes.
- **Fix**: Lift to `InfographicListContainer` with `pendingDeleteId` state (matching documents pattern).

### W3-14: Fix document-uploader to use useRef
- **Files**: `shared/components/document-manager/document-uploader.tsx:87-89`, `features/documents/components/upload-document-dialog.tsx:127`
- **Issue**: `document.getElementById('file-input')?.click()` — fragile global ID lookup.
- **Fix**: Use `useRef<HTMLInputElement>` and `ref.current?.click()`.

### W3-15: Memoize document-manager currentIds
- **File**: `shared/components/document-manager/document-manager.tsx:25`
- **Issue**: `documents.map(d => d.id)` creates new array every render.
- **Fix**: `const currentIds = useMemo(() => documents.map(d => d.id), [documents])`

### W3-16: Memoize podcast-detail-container segments
- **File**: `features/podcasts/components/podcast-detail-container.tsx:29-32`
- **Issue**: `[...(podcast.segments ?? [])]` creates new array on every render.
- **Fix**: `const initialSegments = useMemo(() => [...(podcast.segments ?? [])], [podcast.segments])`

### W3-17: Fix public layout Spinner accessibility
- **File**: `routes/_public/layout.tsx:13`
- **Issue**: Bare `<Spinner />` with no accessible label or centering.
- **Fix**: Wrap in `<div className="flex items-center justify-center h-screen" role="status" aria-label="Loading"><Spinner /></div>`.

### W3-18: Add confirmation dialog `aria-hidden` to icon
- **File**: `shared/components/confirmation-dialog/confirmation-dialog.tsx:40-44`
- **Issue**: Decorative icon div missing `aria-hidden="true"`.
- **Fix**: Add `aria-hidden="true"` to the icon container div.

### W3-19: Wrap add-document-dialog handleUpload in useCallback
- **File**: `shared/components/document-manager/add-document-dialog.tsx:76-91`
- **Issue**: Regular function creates new ref each render, causes DocumentUploader re-renders.
- **Fix**: Wrap in `useCallback`.

### W3-20: Simplify segment-item render-time state sync
- **File**: `features/podcasts/components/workbench/segment-item.tsx:34-59`
- **Issue**: 5 state variables for editing sync. Overly complex.
- **Fix**: Use `key` prop on editing fields keyed to segment content, or `useEffect` to reset on segment change.

### W3-21: Fix favicon error handling in document-detail
- **File**: `features/documents/components/document-detail.tsx:88-99`
- **Issue**: Direct DOM manipulation for favicon error (`e.currentTarget.style.display = 'none'`).
- **Fix**: Use `const [faviconFailed, setFaviconFailed] = useState(false)` and conditional rendering.
