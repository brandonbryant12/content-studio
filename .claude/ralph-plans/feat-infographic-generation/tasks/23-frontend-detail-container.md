# Task 23: See implementation_plan.md for acceptance criteria

## Standards Checklist
- [x] Read relevant standards before implementation

## Implementation Notes
Refer to the main implementation plan for detailed requirements.

## Verification Log

### 2025-01-10 - Task Completed

**Files Created:**
- `apps/web/src/features/infographics/components/infographic-detail-container.tsx` - Main workbench orchestrator

**Files Updated:**
- `apps/web/src/features/infographics/components/index.ts` - Added InfographicDetailContainer export
- `apps/web/src/routes/_protected/infographics/$infographicId.tsx` - Updated to use container

**Implementation Details:**
- Container orchestrates: useInfographic, useInfographicSettings, useSelections, useGenerateInfographic
- Selection mutations: useAddSelection, useRemoveSelection, useReorderSelections
- AI extraction: useExtractKeyPoints with suggestions state
- Keyboard shortcut: Cmd/Ctrl+S to save when hasAnyChanges
- Navigation blocking: useNavigationBlock when hasAnyChanges
- Document state: workbenchDocuments with activeDocumentId
- SSE: relying on mutation hooks for cache invalidation (no manual SSE subscription needed)

**Layout Structure:**
- Left panel: DocumentContentPanel (with TextHighlighter), AISuggestionsPanel, SelectionList
- Right panel: SettingsPanel, PreviewPanel
- Action bar: InfographicActionBar

**Validation:**
- `pnpm typecheck` - ✅ Passed
- `pnpm build` - ✅ Passed
