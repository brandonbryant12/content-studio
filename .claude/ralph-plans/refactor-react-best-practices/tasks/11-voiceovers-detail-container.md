# Task 11: Voiceovers Feature - Detail Container Split

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`
- [ ] `standards/frontend/components.md` - Container/Presenter pattern

## Context

VoiceoverDetailContainer is 167 lines managing:
- Voiceover state
- Generation mutations
- Approval flow
- Collaborator management

Similar to podcasts, this can be split into focused hooks.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `features/voiceovers/components/voiceover-detail-container.tsx` | 27-194 | Multiple concerns |

## Implementation Plan

### 1. Extract Collaborator Management Hook

Reuse pattern from podcasts (or create shared base):

```typescript
// features/voiceovers/hooks/use-collaborator-management.ts
export function useCollaboratorManagement(voiceoverId: string, userId: string) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: collaborators, ...rest } = useCollaborators(voiceoverId);
  // ...
  return {
    collaborators,
    isAddDialogOpen,
    setIsAddDialogOpen,
    handleAdd,
    handleRemove,
    handleApprove,
  };
}
```

### 2. Dynamic Import AddCollaboratorDialog

```typescript
const AddCollaboratorDialog = lazy(() =>
  import('./collaborators/add-collaborator-dialog')
    .then(m => ({ default: m.AddCollaboratorDialog }))
);
```

### 3. Simplified Container

Target: <120 lines

```typescript
export function VoiceoverDetailContainer({ voiceoverId }: Props) {
  const { data: voiceover } = useVoiceover(voiceoverId);
  const settings = useVoiceoverSettings(voiceover);
  const generateMutation = useOptimisticGeneration(voiceoverId);
  const collaborators = useCollaboratorManagement(voiceoverId, userId);

  useNavigationBlock(settings.hasChanges);
  useKeyboardShortcut({ key: 's', cmdOrCtrl: true }, settings.saveSettings);

  return (
    <>
      <VoiceoverDetail
        voiceover={voiceover}
        settings={settings}
        onGenerate={generateMutation.mutate}
        isGenerating={generateMutation.isPending}
        collaborators={collaborators}
      />
      {collaborators.isAddDialogOpen && (
        <Suspense fallback={null}>
          <AddCollaboratorDialog {...} />
        </Suspense>
      )}
    </>
  );
}
```

## Implementation Notes

- Created `use-collaborator-management.ts` hook to extract collaborator/approval logic
- Hook manages: collaborators list, owner info, dialog state, approval handlers
- Added dynamic import for `AddCollaboratorDialog` with lazy() and Suspense
- Container reduced from 194 → 147 lines (47 lines saved, ~24% reduction)
- Did not reach <120 target but achieved significant cleanup

## Verification Log

- [x] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web test` passes (pre-existing failures)
- [~] Container reduced to 147 lines (194 → 147, target was <120)
- [x] `useCollaboratorManagement` hook created
- [x] AddCollaboratorDialog dynamically imported
