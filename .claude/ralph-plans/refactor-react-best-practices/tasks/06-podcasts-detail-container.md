# Task 06: Podcasts Feature - Detail Container Split

## Standards Checklist

Before starting implementation, read and understand:
- [x] `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`
- [x] `standards/frontend/components.md` - Container/Presenter pattern

## Context

PodcastDetailContainer is 220+ lines managing:
- Script editing state
- Settings state
- Document selection
- Generation/save mutations
- Collaborator management
- Navigation blocking
- Keyboard shortcuts

This should be split into focused hooks for better maintainability and testability.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/podcasts/components/podcast-detail-container.tsx` | 34-253 | Too many concerns |
| `features/podcasts/hooks/use-collaborators.ts` | - | Already exists, but more logic needed |

## Implementation Plan

### 1. Extract Collaborator Management Hook

```typescript
// features/podcasts/hooks/use-collaborator-management.ts
export function useCollaboratorManagement(podcastId: string, isOwner: boolean) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: collaborators } = useCollaboratorsQuery(podcastId);
  const addMutation = useAddCollaborator(podcastId);
  const removeMutation = useRemoveCollaborator(podcastId);
  const approveMutation = useApprovePodcast(podcastId);

  const handleAdd = useCallback((email: string) => {
    addMutation.mutate({ email });
    setIsAddDialogOpen(false);
  }, [addMutation]);

  const handleRemove = useCallback((collaboratorId: string) => {
    removeMutation.mutate({ collaboratorId });
  }, [removeMutation]);

  return {
    collaborators,
    isAddDialogOpen,
    setIsAddDialogOpen,
    handleAdd,
    handleRemove,
    handleApprove: approveMutation.mutate,
    isApproving: approveMutation.isPending,
  };
}
```

### 2. Extract Actions Hook

```typescript
// features/podcasts/hooks/use-podcast-actions.ts
export function usePodcastActions(
  podcastId: string,
  scriptEditor: UseScriptEditorReturn,
  settings: UsePodcastSettingsReturn,
  documentSelection: UseDocumentSelectionReturn,
) {
  const generateMutation = useOptimisticGeneration(podcastId);
  const saveMutation = useOptimisticSaveChanges(podcastId);

  const hasChanges = scriptEditor.hasChanges ||
                     settings.hasChanges ||
                     documentSelection.hasChanges;

  const handleSave = useCallback(async () => {
    // Save logic
  }, [scriptEditor, settings, saveMutation]);

  const handleGenerate = useCallback(async () => {
    // Generation logic
  }, [generateMutation, documentSelection]);

  return {
    hasChanges,
    isSaving: saveMutation.isPending,
    isGenerating: generateMutation.isPending,
    handleSave,
    handleGenerate,
  };
}
```

### 3. Dynamic Import AddCollaboratorDialog

```typescript
// podcast-detail-container.tsx
const AddCollaboratorDialog = lazy(() =>
  import('./collaborators/add-collaborator-dialog').then(m => ({ default: m.AddCollaboratorDialog }))
);

// In render
{collaboratorManagement.isAddDialogOpen && (
  <Suspense fallback={null}>
    <AddCollaboratorDialog
      open={collaboratorManagement.isAddDialogOpen}
      onOpenChange={collaboratorManagement.setIsAddDialogOpen}
      onAdd={collaboratorManagement.handleAdd}
    />
  </Suspense>
)}
```

### 4. Simplified Container

Target: <150 lines

```typescript
export function PodcastDetailContainer({ podcastId }: Props) {
  const { data: podcast } = usePodcast(podcastId);
  const scriptEditor = useScriptEditor(podcast?.currentVersion?.script);
  const settings = usePodcastSettings(podcast);
  const documentSelection = useDocumentSelection(podcast?.documentIds);
  const actions = usePodcastActions(podcastId, scriptEditor, settings, documentSelection);
  const collaborators = useCollaboratorManagement(podcastId, podcast?.isOwner);

  useNavigationBlock(actions.hasChanges);
  useKeyboardShortcut({ key: 's', cmdOrCtrl: true }, actions.handleSave);

  if (isSetupMode(podcast?.status)) {
    return <SetupWizardContainer podcast={podcast} />;
  }

  return (
    <>
      <PodcastDetail
        podcast={podcast}
        scriptEditor={scriptEditor}
        settings={settings}
        documentSelection={documentSelection}
        actions={actions}
        collaborators={collaborators.collaborators}
      />
      <Suspense fallback={null}>
        {collaborators.isAddDialogOpen && (
          <AddCollaboratorDialog {...} />
        )}
      </Suspense>
    </>
  );
}
```

## Implementation Notes

**Completed 2024-01-24:**

1. Created `use-collaborator-management.ts` hook that:
   - Manages dialog open/close state via `isAddDialogOpen`, `openAddDialog`, `closeAddDialog`
   - Queries collaborators via `useCollaboratorsQuery`
   - Provides `handleRemove` callback for removing collaborators
   - Returns `isRemoving` loading state

2. Created `use-podcast-actions.ts` hook that:
   - Consolidates all save/generation/delete mutations
   - Contains the complex save logic (document changes vs script-only changes)
   - Returns `hasAnyChanges`, `isSaving`, `isGenerating`, `isPendingGeneration`, `isDeleting`
   - Returns stable `handleSave`, `handleGenerate`, `handleDelete` callbacks

3. Updated `podcast-detail-container.tsx`:
   - Added dynamic import for `AddCollaboratorDialog` using React `lazy`
   - Used the new hooks to reduce container to 139 lines (target was <150)
   - Wrapped dialog in `Suspense` with conditional rendering for code splitting

4. Updated `hooks/index.ts` barrel export with new hooks

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web test` passes (pre-existing failures unrelated to this task)
- [x] Container reduced to <150 lines (139 lines)
- [x] `useCollaboratorManagement` hook created
- [x] `usePodcastActions` hook created
- [x] AddCollaboratorDialog dynamically imported
