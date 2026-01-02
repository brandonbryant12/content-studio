# Frontend Refactoring Implementation Plan

> **STATUS: IN PROGRESS** - Sprint 2 complete, Sprint 3 next
> - Backend refactoring complete (previous plan archived)
> - Frontend refactoring to match backend standards

## Overview

Refactor the Content Studio frontend to follow documented standards with feature-based organization, Container/Presenter pattern, Suspense-first data fetching, and optimistic mutation factory.

## Validation Commands

After each change, run these commands to validate:

```bash
# Type check and build
pnpm --filter web typecheck
pnpm --filter web build

# Run tests
pnpm --filter web test

# Full validation
pnpm typecheck && pnpm test && pnpm build
```

---

## Target Architecture

```
apps/web/src/
├── features/
│   ├── podcasts/
│   │   ├── components/
│   │   │   ├── podcast-detail-container.tsx    # Container
│   │   │   ├── podcast-detail.tsx              # Presenter
│   │   │   ├── podcast-list-container.tsx
│   │   │   ├── podcast-list.tsx
│   │   │   └── workbench/                      # Sub-components
│   │   ├── hooks/
│   │   │   ├── use-podcast.ts                  # useSuspenseQuery
│   │   │   ├── use-podcast-list.ts
│   │   │   ├── use-optimistic-generation.ts    # Uses factory
│   │   │   └── use-script-editor.ts            # Local state
│   │   └── lib/status.ts
│   └── documents/
│       ├── components/
│       └── hooks/
├── shared/
│   ├── components/
│   │   ├── suspense-boundary.tsx               # New
│   │   └── error-boundary/                     # Moved
│   ├── hooks/
│   │   ├── use-optimistic-mutation.ts          # Factory hook
│   │   └── use-navigation-block.ts             # Extracted
│   └── lib/
│       └── errors.ts                           # Moved
└── routes/                                     # Thin route files
    └── _protected/podcasts/$podcastId.tsx      # < 30 lines
```

---

## Step 0: Familiarize with Standards

**Goal**: Read and understand all frontend standards before implementation

### Read Core Standards
- [ ] `/standards/frontend/components.md` - Container/Presenter pattern
- [ ] `/standards/frontend/data-fetching.md` - TanStack Query with useSuspenseQuery
- [ ] `/standards/frontend/mutations.md` - Optimistic mutation factory pattern
- [ ] `/standards/frontend/error-handling.md` - Error formatting with isDefinedError

### Read Supporting Standards
- [ ] `/standards/frontend/forms.md` - TanStack Form patterns
- [ ] `/standards/frontend/real-time.md` - SSE and query invalidation
- [ ] `/standards/frontend/styling.md` - Design system patterns
- [ ] `/standards/frontend/testing.md` - Integration testing with MSW

### Review Current Implementation
- [ ] `apps/web/src/routes/_protected/podcasts/$podcastId.tsx` - Main file to refactor
- [ ] `apps/web/src/hooks/` - Current hook patterns
- [ ] `apps/web/src/lib/errors.ts` - Existing error handling (already follows standards)

**No code changes in this sprint** - understanding only.

---

## Sprint 1: Foundation ✅ COMPLETE

**Goal**: Create shared infrastructure

### 1.1 Create `shared/hooks/use-optimistic-mutation.ts` ✅
Factory hook that all feature mutations will use:
- `queryKey`, `mutationFn`, `getOptimisticData`
- Auto rollback on error
- Toast integration
- `showSuccessToast` option

### 1.2 Create `shared/components/suspense-boundary.tsx` ✅
Combines ErrorBoundary + Suspense with default spinner fallback

### 1.3 Create `shared/hooks/use-navigation-block.ts` ✅
Extract from `$podcastId.tsx`:
- TanStack Router `useBlocker`
- Browser `beforeunload` handling

### 1.4 Create `shared/hooks/use-keyboard-shortcut.ts` ✅
Generic keyboard shortcut hook

### 1.5 Move shared code to `/shared/` ✅
| From | To |
|------|-----|
| `src/components/error-boundary/` | `src/shared/components/error-boundary/` |
| `src/components/confirmation-dialog/` | `src/shared/components/confirmation-dialog/` |
| `src/components/base-dialog/` | `src/shared/components/base-dialog/` |
| `src/lib/errors.ts` | `src/shared/lib/errors.ts` |
| `src/lib/formatters.ts` | `src/shared/lib/formatters.ts` |

### 1.6 Create `shared/index.ts` barrel export ✅

**Validation**: `pnpm --filter web typecheck` ✅ PASSED

---

## Sprint 2: Podcasts Feature - Hooks ✅ COMPLETE

**Goal**: Create feature-based hooks

### 2.1 Create `features/podcasts/hooks/use-podcast.ts` ✅
- `usePodcast(podcastId)` with useSuspenseQuery
- `getPodcastQueryKey(podcastId)` helper for cache operations

### 2.2 Create `features/podcasts/hooks/use-podcast-list.ts` ✅
- `usePodcastList()` with useQuery (conditional fetching)
- `useSuspensePodcastList()` with useSuspenseQuery
- `getPodcastListQueryKey()` helper

### 2.3 Create mutation hooks using factory ✅
- `use-optimistic-generation.ts` - Full generation with factory
- `use-optimistic-save-changes.ts` - Save changes with factory
- `use-optimistic-delete.ts` - Delete with factory and navigation

### 2.4 Move existing hooks ✅
| From | To |
|------|-----|
| `src/hooks/use-script-editor.ts` | `features/podcasts/hooks/use-script-editor.ts` |
| `src/hooks/use-podcast-settings.ts` | `features/podcasts/hooks/use-podcast-settings.ts` |
| `src/hooks/use-document-selection.ts` | `features/podcasts/hooks/use-document-selection.ts` |
| `src/hooks/use-podcast-generation.ts` | `features/podcasts/hooks/use-podcast-generation.ts` |

### 2.5 Create `features/podcasts/hooks/index.ts` barrel ✅
- Feature barrel: `features/podcasts/index.ts`
- Root features barrel: `features/index.ts`
- Backward compatibility: `src/hooks/index.ts` re-exports from features

### 2.6 Update shared factory hook ✅
- `useOptimisticMutation` now uses `MutationFunction` type for TanStack Query compatibility

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build` ✅ PASSED

---

## Sprint 3: Podcasts - Container/Presenter Split

**Goal**: Split `$podcastId.tsx` (263 lines) into Container + Presenter

### 3.1 Create `features/podcasts/components/podcast-detail-container.tsx`
**Container responsibilities**:
- `usePodcast(podcastId)` with Suspense
- Coordinate hooks: `useScriptEditor`, `usePodcastSettings`, `useDocumentSelection`
- Mutation handlers: `handleSave`, `handleGenerate`, `handleDelete`
- `useKeyboardShortcut` for Cmd+S
- `useNavigationBlock` for unsaved changes
- Show `SetupWizardContainer` if `isSetupMode(podcast)`

### 3.2 Create `features/podcasts/components/podcast-detail.tsx`
**Presenter responsibilities** (pure UI):
```typescript
interface PodcastDetailProps {
  podcast: Podcast;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
  hasChanges: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: () => void;
  onGenerate: () => void;
  onDelete: () => void;
}
```

### 3.3 Update route file to be thin
```typescript
// routes/_protected/podcasts/$podcastId.tsx (< 30 lines)
function PodcastPage() {
  const { podcastId } = Route.useParams();
  return (
    <SuspenseBoundary resetKeys={[podcastId]}>
      <PodcastDetailContainer />
    </SuspenseBoundary>
  );
}
```

### 3.4 Move workbench components
Move `routes/_protected/podcasts/-components/workbench/` → `features/podcasts/components/workbench/`

### 3.5 Create `features/podcasts/lib/status.ts`
- `isGeneratingStatus(status)`
- `isSetupMode(podcast)`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 4: Podcast List Page

**Goal**: Apply Container/Presenter to list page

### 4.1 Create `PodcastListContainer`
- `usePodcastList()` for data
- Search state management
- Create/delete mutation handlers

### 4.2 Create `PodcastList` presenter
Pure UI with props:
```typescript
interface PodcastListProps {
  podcasts: Podcast[];
  searchQuery: string;
  isLoading: boolean;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}
```

### 4.3 Update `routes/_protected/podcasts/index.tsx`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 5: Documents Feature

**Goal**: Apply same patterns to documents

### 5.1 Create `features/documents/hooks/`
- `use-documents.ts` (query + suspense variants)
- `use-optimistic-delete.ts` (using factory)

### 5.2 Create Container/Presenter
- `DocumentListContainer`
- `DocumentList`

### 5.3 Update `routes/_protected/documents/index.tsx`

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build`

---

## Sprint 6: Dashboard and Cleanup

**Goal**: Update dashboard, remove old code

### 6.1 Create `DashboardContainer`
Uses hooks from both features

### 6.2 Remove old directories
After verification:
- Delete `src/hooks/` (moved to features)
- Delete `src/db/` (replaced by feature hooks)
- Delete `src/components/` (moved to shared)
- Delete route `-components/` directories

### 6.3 Update all import paths

**Final Validation**: `pnpm typecheck && pnpm test && pnpm build`

---

## Key Files to Modify

| File | Action |
|------|--------|
| `apps/web/src/routes/_protected/podcasts/$podcastId.tsx` | Replace 263-line god component with thin route |
| `apps/web/src/hooks/use-optimistic-podcast-mutation.ts` | Refactor to use factory |
| `apps/web/src/hooks/use-script-editor.ts` | Move to features |
| `apps/web/src/hooks/use-podcast-settings.ts` | Move to features |
| `apps/web/src/db/hooks.ts` | Replace with feature hooks |

---

## Success Criteria

- [x] **Sprint 1**: Factory hook + SuspenseBoundary + shared structure
- [x] **Sprint 2**: All podcast hooks in `features/podcasts/hooks/`
- [ ] **Sprint 3**: `$podcastId.tsx` < 30 lines, Container/Presenter split
- [ ] **Sprint 4**: Podcast list page refactored
- [ ] **Sprint 5**: Documents feature follows same patterns
- [ ] **Sprint 6**: Old code removed, all imports updated

Each sprint maintains working functionality with passing build.

---

## Standards Reference

- `/standards/frontend/components.md` - Container/Presenter pattern
- `/standards/frontend/data-fetching.md` - useSuspenseQuery patterns
- `/standards/frontend/mutations.md` - Optimistic mutation factory
- `/standards/frontend/error-handling.md` - Error formatting
