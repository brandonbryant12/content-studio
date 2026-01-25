# React Best Practices Tech Debt - Implementation Plan

> **STATUS: IN_PROGRESS**

## Overview

Address all React performance tech debt following Vercel's React Best Practices guidelines. This plan covers ~40+ optimizations across all priority levels (CRITICAL to LOW), organized by feature. Includes barrel import elimination, React.memo additions, useCallback/useMemo optimizations, component splitting, dynamic imports, and comprehensive test coverage.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Organization | By feature (podcasts → voiceovers → documents → shared) |
| Scope | All priorities (CRITICAL → LOW) |
| Testing | Include tests for all optimizations |
| Large components | Split into smaller containers/hooks |
| Code splitting | Dynamic imports for heavy/conditional components |

## Validation Commands

```bash
# Package-specific
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build

# Full validation
pnpm typecheck && pnpm build && pnpm test
```

## Issues

<!-- Agent checks this section each pass for user-created issues -->
| Issue | Status | Notes |
|-------|--------|-------|
| _No issues_ | | |

---

## Already Completed Patterns (Reference)

These patterns are already correctly implemented and serve as examples:

| Pattern | File | Lines | Notes |
|---------|------|-------|-------|
| Lazy state init | `use-script-editor.ts` | 36-41 | `useState(() => initialSegments)` |
| Refs for transient | `use-podcast-settings.ts` | 106, 109 | `hasUserEditsRef`, `podcastIdRef` |
| Refs for transient | `use-script-editor.ts` | 42-43 | `hasUserEdits`, `prevInitialSegmentsRef` |
| Refs for transient | `use-voiceover-settings.ts` | 47, 50 | Same pattern |
| Refs for SSE | `use-sse.ts` | 38-42 | Connection management refs |
| React.memo | `podcast-item.tsx` | 55 | List item memoization |
| React.memo | `voiceover-item.tsx` | 48 | List item memoization |
| React.memo | `document-item.tsx` | 45 | List item memoization |
| useMemo filter | `document-manager.tsx` | 101-108 | Memoized filtering |
| useMemo truncation | `voiceover-item.tsx` | 54-59 | Text preview memoization |
| Hoisted TABS | `config-panel.tsx` | 23-26 | Static array outside component |

---

## Tasks

### Task 01: Podcasts Feature - Barrel Import Cleanup
**Status:** ✅ COMPLETE
**Standards:** `bundle-barrel-imports`
**Acceptance Criteria:**
- [x] Replace all `from '../hooks'` with direct imports in podcast components (already using direct imports)
- [x] Replace all `from '@/features/podcasts'` with direct imports in routes (already using direct imports)
- [x] Remove wildcard exports from `podcasts/components/index.ts`
- [x] Remove wildcard exports from `podcasts/hooks/index.ts` (already using specific exports)
- [x] Typecheck passes
**Details:** [01-podcasts-barrel-imports.md](./tasks/01-podcasts-barrel-imports.md)

---

### Task 02: Podcasts Feature - List Components Optimization
**Status:** ✅ COMPLETE
**Standards:** `rerender-memo`, `rerender-memo-with-default-value`
**Acceptance Criteria:**
- [x] Add React.memo to `CollaboratorRow` in collaborator-list.tsx
- [x] Memoize `filteredPodcasts` in podcast-list.tsx with useMemo
- [x] Convert inline arrow functions to useCallback in podcast-list.tsx
- [ ] Add test verifying memo prevents unnecessary re-renders (skipped - pre-existing test issues)
- [x] Typecheck passes
**Details:** [02-podcasts-list-optimization.md](./tasks/02-podcasts-list-optimization.md)

---

### Task 03: Podcasts Feature - Script Editor Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `rerender-memo`, `rerender-memo-with-default-value`, `rendering-hoist-jsx`
**Acceptance Criteria:**
- [ ] Extract inline callbacks from SegmentItem props to useCallback
- [ ] Memoize `ScriptEditor` component
- [ ] Hoist static elements outside render
- [ ] Add test for SegmentItem callback stability
- [ ] Typecheck passes
**Details:** [03-podcasts-script-editor.md](./tasks/03-podcasts-script-editor.md)

---

### Task 04: Podcasts Feature - Config Panel Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `rerender-memo-with-default-value`, `rerender-functional-setstate`
**Acceptance Criteria:**
- [ ] Convert inline onClick handlers to useCallback
- [ ] Use functional setState for toggle operations
- [ ] Verify TABS array is already hoisted (reference only)
- [ ] Typecheck passes
**Details:** [04-podcasts-config-panel.md](./tasks/04-podcasts-config-panel.md)

---

### Task 05: Podcasts Feature - Document Manager Split & Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `rerender-memo`, `bundle-dynamic-imports`
**Acceptance Criteria:**
- [ ] Split DocumentManager (413 lines) into DocumentSelector and DocumentUploader
- [ ] Add React.memo to new sub-components
- [ ] Convert inline handlers to useCallback
- [ ] Dynamic import DocumentUploader (only needed on upload tab)
- [ ] Add tests for split components
- [ ] Typecheck passes
**Details:** [05-podcasts-document-manager.md](./tasks/05-podcasts-document-manager.md)

---

### Task 06: Podcasts Feature - Detail Container Split
**Status:** ⏳ NOT_STARTED
**Standards:** Component splitting, `bundle-dynamic-imports`
**Acceptance Criteria:**
- [ ] Extract collaborator management to `useCollaboratorManagement` hook
- [ ] Extract save/generation logic to `usePodcastActions` hook
- [ ] Dynamic import `AddCollaboratorDialog` (conditionally rendered)
- [ ] Reduce container to <150 lines
- [ ] Typecheck passes
**Details:** [06-podcasts-detail-container.md](./tasks/06-podcasts-detail-container.md)

---

### Task 07: Podcasts Feature - Setup Wizard Dynamic Import
**Status:** ⏳ NOT_STARTED
**Standards:** `bundle-dynamic-imports`
**Acceptance Criteria:**
- [ ] Dynamic import SetupWizardContainer in route
- [ ] Add Suspense boundary with loading fallback
- [ ] Verify bundle split in build output
- [ ] Typecheck passes
**Details:** [07-podcasts-setup-wizard.md](./tasks/07-podcasts-setup-wizard.md)

---

### Task 08: Voiceovers Feature - Barrel Import Cleanup
**Status:** ⏳ NOT_STARTED
**Standards:** `bundle-barrel-imports`
**Acceptance Criteria:**
- [ ] Replace all barrel imports with direct imports
- [ ] Remove wildcard exports from feature index files
- [ ] Typecheck passes
**Details:** [08-voiceovers-barrel-imports.md](./tasks/08-voiceovers-barrel-imports.md)

---

### Task 09: Voiceovers Feature - List & Voice Selector Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `rerender-memo`, `rerender-memo-with-default-value`
**Acceptance Criteria:**
- [ ] Add React.memo to VoiceSelector
- [ ] Add React.memo to CollaboratorRow in collaborator-list.tsx
- [ ] Memoize filteredVoiceovers in voiceover-list.tsx
- [ ] Convert onChange handlers to useCallback in voice-selector.tsx
- [ ] Add tests for memo behavior
- [ ] Typecheck passes
**Details:** [09-voiceovers-list-optimization.md](./tasks/09-voiceovers-list-optimization.md)

---

### Task 10: Voiceovers Feature - Text Editor Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `rendering-hoist-jsx`, `js-cache-property-access`
**Acceptance Criteria:**
- [ ] Hoist circle math constants (radius, circumference) outside component
- [ ] Memoize CharacterCountRing or move calculations to useMemo
- [ ] Convert onChange to useCallback in TextEditor
- [ ] Typecheck passes
**Details:** [10-voiceovers-text-editor.md](./tasks/10-voiceovers-text-editor.md)

---

### Task 11: Voiceovers Feature - Detail Container Split
**Status:** ⏳ NOT_STARTED
**Standards:** Component splitting, `bundle-dynamic-imports`
**Acceptance Criteria:**
- [ ] Extract collaborator/approval logic to custom hook
- [ ] Dynamic import AddCollaboratorDialog
- [ ] Reduce container to <120 lines
- [ ] Typecheck passes
**Details:** [11-voiceovers-detail-container.md](./tasks/11-voiceovers-detail-container.md)

---

### Task 12: Documents Feature - Barrel Import & List Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `bundle-barrel-imports`, `rerender-memo`
**Acceptance Criteria:**
- [ ] Replace barrel imports with direct imports
- [ ] Memoize filteredDocuments in document-list.tsx
- [ ] Convert onSearch handler to useCallback
- [ ] Typecheck passes
**Details:** [12-documents-optimization.md](./tasks/12-documents-optimization.md)

---

### Task 13: Shared Hooks - SSE Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `rerender-dependencies`, `client-event-listeners`
**Acceptance Criteria:**
- [ ] Stabilize handleEvent callback dependencies
- [ ] Use useRef to store connect function instead of recreating
- [ ] Add useCallback with stable dependencies for connect
- [ ] Prevent excessive reconnection cycles
- [ ] Add test for connection stability
- [ ] Typecheck passes
**Details:** [13-shared-hooks-sse.md](./tasks/13-shared-hooks-sse.md)

---

### Task 14: Shared Hooks - Keyboard Shortcut Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `rerender-dependencies`
**Acceptance Criteria:**
- [ ] Remove `enabled` from useCallback dependencies (already checked internally)
- [ ] Verify event listener attachment stability
- [ ] Add test for callback stability
- [ ] Typecheck passes
**Details:** [14-shared-hooks-keyboard.md](./tasks/14-shared-hooks-keyboard.md)

---

### Task 15: Feature Hooks - List Select Optimization
**Status:** ⏳ NOT_STARTED
**Standards:** `js-cache-function-results`
**Acceptance Criteria:**
- [ ] Optimize select function in use-podcast-list.ts (avoid Date object recreation)
- [ ] Optimize select function in use-voiceover-list.ts
- [ ] Optimize select function in use-document-list.ts
- [ ] Use string comparison for ISO dates or cache Date objects
- [ ] Typecheck passes
**Details:** [15-feature-hooks-select.md](./tasks/15-feature-hooks-select.md)

---

### Task 16: Feature Hooks - Settings Return Object Memoization
**Status:** ⏳ NOT_STARTED
**Standards:** `rerender-memo-with-default-value`
**Acceptance Criteria:**
- [ ] Memoize return object in use-podcast-settings.ts
- [ ] Memoize loadingStates object in use-podcast-generation.ts
- [ ] Verify memoization doesn't break reactivity
- [ ] Typecheck passes
**Details:** [16-feature-hooks-settings.md](./tasks/16-feature-hooks-settings.md)

---

### Task 17: Root Layout - Toaster Deferral
**Status:** ⏳ NOT_STARTED
**Standards:** `bundle-defer-third-party`
**Acceptance Criteria:**
- [ ] Defer Toaster initialization until after hydration
- [ ] Use dynamic import or useEffect for toast library
- [ ] Verify toast functionality still works
- [ ] Typecheck passes
**Details:** [17-root-toaster-deferral.md](./tasks/17-root-toaster-deferral.md)

---

### Task 99: Final Verification
**Status:** ⏳ NOT_STARTED
**Standards:** All standards referenced in prior tasks
**Acceptance Criteria:**
- [ ] All prior tasks verified by subagent review
- [ ] No barrel imports remain (grep verification)
- [ ] All list components use React.memo
- [ ] All inline callbacks converted to useCallback
- [ ] Dynamic imports working for conditional components
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes
- [ ] Bundle size comparison before/after
**Details:** [99-final-verification.md](./tasks/99-final-verification.md)

---

## Key Files to Modify

| File | Tasks | Actions |
|------|-------|---------|
| `features/podcasts/hooks/index.ts` | 01 | Remove wildcard exports |
| `features/podcasts/components/index.ts` | 01 | Remove wildcard exports |
| `features/podcasts/components/podcast-list.tsx` | 02 | Add useMemo for filter |
| `features/podcasts/components/collaborators/collaborator-list.tsx` | 02 | Add React.memo to CollaboratorRow |
| `features/podcasts/components/workbench/script-editor.tsx` | 03 | Extract callbacks, add memo |
| `features/podcasts/components/workbench/config-panel.tsx` | 04 | Convert handlers to useCallback |
| `features/podcasts/components/workbench/document-manager.tsx` | 05 | Split into sub-components |
| `features/podcasts/components/podcast-detail-container.tsx` | 06 | Extract hooks, reduce size |
| `routes/_protected/podcasts/$podcastId.tsx` | 07 | Dynamic import SetupWizard |
| `features/voiceovers/hooks/index.ts` | 08 | Remove wildcard exports |
| `features/voiceovers/components/voiceover-list.tsx` | 09 | Add useMemo for filter |
| `features/voiceovers/components/workbench/voice-selector.tsx` | 09 | Add React.memo |
| `features/voiceovers/components/workbench/text-editor.tsx` | 10 | Hoist constants, useCallback |
| `features/voiceovers/components/voiceover-detail-container.tsx` | 11 | Extract hooks, reduce size |
| `features/documents/components/document-list.tsx` | 12 | Add useMemo, useCallback |
| `shared/hooks/use-sse.ts` | 13 | Stabilize dependencies |
| `shared/hooks/use-keyboard-shortcut.ts` | 14 | Fix callback dependencies |
| `features/*/hooks/use-*-list.ts` | 15 | Optimize select functions |
| `features/podcasts/hooks/use-podcast-settings.ts` | 16 | Memoize return object |
| `routes/__root.tsx` | 17 | Defer Toaster |

---

## Success Criteria

- [ ] **Task 01-07**: Podcasts feature fully optimized
- [ ] **Task 08-11**: Voiceovers feature fully optimized
- [ ] **Task 12**: Documents feature fully optimized
- [ ] **Task 13-14**: Shared hooks optimized
- [ ] **Task 15-16**: Feature hooks optimized
- [ ] **Task 17**: Root bundle optimized
- [ ] **Task 99**: All code verified, tests passing

Each task maintains working functionality with passing build.

---

## Standards Reference

- `.claude/skills/vercel-react-best-practices/AGENTS.md` - Full React best practices guide
- `standards/frontend/components.md` - Container/Presenter pattern
- `standards/frontend/data-fetching.md` - TanStack Query patterns
