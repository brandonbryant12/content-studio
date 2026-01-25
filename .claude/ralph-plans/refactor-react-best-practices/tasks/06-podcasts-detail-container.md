# Task 06: Podcasts Feature - Detail Container Split

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`
- [ ] `standards/frontend/components.md` - Container/Presenter pattern

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

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web test` passes
- [ ] Container reduced to <150 lines
- [ ] `useCollaboratorManagement` hook created and tested
- [ ] `usePodcastActions` hook created and tested
- [ ] AddCollaboratorDialog dynamically imported
