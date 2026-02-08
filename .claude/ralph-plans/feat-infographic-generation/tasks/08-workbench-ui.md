# Task 08: Infographic Workbench UI

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/frontend/components.md`
- [ ] `standards/frontend/mutations.md`
- [ ] `standards/frontend/forms.md`
- [ ] `standards/frontend/styling.md`

## Context

Follow the exact patterns in:
- `apps/web/src/features/podcasts/components/podcast-detail-container.tsx` — Container with lazy loading, keyboard shortcuts
- `apps/web/src/features/podcasts/hooks/use-podcast-actions.ts` — Actions hook pattern
- `apps/web/src/shared/hooks/sse-handlers.ts` — SSE event handlers for cache invalidation

## Key Files

### Modify
- `apps/web/src/shared/hooks/sse-handlers.ts` — Add infographic event handling

### Create
- `apps/web/src/features/infographics/components/infographic-workbench-provider.tsx`
- `apps/web/src/features/infographics/components/infographic-workbench-container.tsx`
- `apps/web/src/features/infographics/components/prompt-panel.tsx`
- `apps/web/src/features/infographics/components/preview-panel.tsx`
- `apps/web/src/features/infographics/components/version-history-strip.tsx`
- `apps/web/src/features/infographics/components/type-selector.tsx`
- `apps/web/src/features/infographics/components/style-selector.tsx`
- `apps/web/src/features/infographics/components/format-selector.tsx`
- `apps/web/src/features/infographics/components/source-document-selector.tsx`
- `apps/web/src/features/infographics/components/export-dropdown.tsx`
- `apps/web/src/features/infographics/hooks/use-infographic-versions.ts`

## Implementation Notes

### Workbench Provider (Context)

```typescript
interface InfographicWorkbenchState {
  prompt: string;
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
  format: InfographicFormat;
  selectedVersionId: string | null;
  sourceDocumentIds: string[];
}

interface InfographicWorkbenchActions {
  setPrompt: (prompt: string) => void;
  setType: (type: InfographicType) => void;
  setStyle: (style: InfographicStyle) => void;
  setFormat: (format: InfographicFormat) => void;
  selectVersion: (versionId: string) => void;
  setSourceDocuments: (ids: string[]) => void;
  generate: () => void;
  save: () => void;
  download: () => void;
}

interface InfographicWorkbenchMeta {
  isGenerating: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  infographic: InfographicOutput;
}

const InfographicWorkbenchContext = createContext<{
  state: InfographicWorkbenchState;
  actions: InfographicWorkbenchActions;
  meta: InfographicWorkbenchMeta;
} | null>(null);

// Use React 19 `use()` instead of `useContext()`
export const useInfographicWorkbench = () => {
  const ctx = use(InfographicWorkbenchContext);
  if (!ctx) throw new Error('useInfographicWorkbench must be used within InfographicWorkbenchProvider');
  return ctx;
};
```

### Workbench Layout

```
┌─────────────────────────────────────────────────────────┐
│ [← Back]  Title (editable)          [Export ▾] [Save]   │  ← TOP BAR
├──────────────────────┬──────────────────────────────────┤
│ Prompt               │                                  │
│ [textarea]           │                                  │
│                      │      Image Preview               │
│ Type: ○ ○ ○ ○        │      (or empty state)            │
│ Style: ○ ○ ○ ○ ○ ○   │      (or loading skeleton)       │  ← MAIN AREA
│ Format: ○ ○ ○ ○      │                                  │
│ Source: [dropdown]   │                                  │
│                      │                                  │
│ [Generate]           │                                  │
├──────────────────────┴──────────────────────────────────┤
│ [v1] [v2] [v3] [v4] ...  version thumbnails            │  ← BOTTOM STRIP
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown (each < 300 lines)

**prompt-panel.tsx** (~100 lines)
- Textarea for prompt with character count
- `aria-label="Infographic prompt"`
- Syncs with workbench context

**type-selector.tsx** (~80 lines)
- Radio group with 4 options: Timeline, Comparison, Stats Dashboard, Key Takeaways
- Visual cards with icon + label + description
- `role="radiogroup"` + `aria-label="Infographic type"`

**style-selector.tsx** (~80 lines)
- Radio group with 6 style presets
- Color-coded chips/cards
- `role="radiogroup"` + `aria-label="Style preset"`

**format-selector.tsx** (~60 lines)
- Radio group with 4 format options showing aspect ratio previews
- `role="radiogroup"` + `aria-label="Image format"`

**source-document-selector.tsx** (~80 lines)
- Radix Select dropdown listing user's documents
- Multi-select via checkboxes
- "None (prompt only)" option

**preview-panel.tsx** (~120 lines)
- Three states:
  1. Empty: placeholder with "Generate your first infographic" CTA
  2. Loading: skeleton with animated pulse + "Generating..." text
  3. Ready: full image with zoom controls
- Image uses `object-contain` for proper aspect ratio
- `alt` text: "{title} infographic"

**version-history-strip.tsx** (~100 lines)
- Horizontal scrollable strip
- Thumbnail cards with version number badge
- Selected version highlighted
- Click to select (updates preview)
- Empty state: "No versions yet"

**export-dropdown.tsx** (~50 lines)
- Radix DropdownMenu with "Download PNG" option
- Future: add SVG, PDF options

### SSE Handler Update

In `sse-handlers.ts`:
```typescript
case 'infographic_job_completion': {
  queryClient.invalidateQueries({ queryKey: ['infographics', event.infographicId] });
  queryClient.invalidateQueries({ queryKey: ['infographics'] }); // list
  break;
}
case 'entity_change': {
  if (event.entityType === 'infographic') {
    queryClient.invalidateQueries({ queryKey: ['infographics', event.entityId] });
    queryClient.invalidateQueries({ queryKey: ['infographics'] });
  }
  break;
}
```

### Keyboard Shortcuts
- `Cmd+S` / `Ctrl+S` — Save changes
- `Cmd+Enter` / `Ctrl+Enter` — Generate

### Navigation Blocking
- Block navigation when `hasChanges` is true (unsaved prompt/settings changes)
- Use TanStack Router's `useBlocker`

### Performance
- Lazy-load the workbench container (it's the heaviest component)
- Image preview: use `loading="lazy"` for version thumbnails
- Only update state when displayed values change

## Verification Log

<!-- Agent writes verification results here -->
