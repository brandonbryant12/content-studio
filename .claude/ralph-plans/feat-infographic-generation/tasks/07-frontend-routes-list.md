# Task 07: Frontend Routes + List Page

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/frontend/components.md`
- [ ] `standards/frontend/data-fetching.md`
- [ ] `standards/frontend/styling.md`

## Context

Follow the exact patterns in:
- `apps/web/src/routes/_protected/podcasts/index.tsx` — Route with loader, page component
- `apps/web/src/routes/_protected/layout.tsx` — Sidebar NavLink pattern
- `apps/web/src/features/podcasts/components/podcast-list-container.tsx` — Container pattern
- `apps/web/src/features/podcasts/components/podcast-list.tsx` — Presenter pattern

## Key Files

### Modify
- `apps/web/src/routes/_protected/layout.tsx` — Add Infographics NavLink to sidebar

### Create
- `apps/web/src/routes/_protected/infographics/index.tsx` — List route
- `apps/web/src/routes/_protected/infographics/$infographicId.tsx` — Detail/workbench route
- `apps/web/src/features/infographics/components/infographic-list-container.tsx`
- `apps/web/src/features/infographics/components/infographic-list.tsx`
- `apps/web/src/features/infographics/hooks/use-infographic-list.ts`
- `apps/web/src/features/infographics/hooks/use-infographic.ts`
- `apps/web/src/features/infographics/hooks/use-infographic-actions.ts`

## Implementation Notes

### Sidebar NavLink

Add after voiceovers in `layout.tsx`:
```tsx
<NavLink
  to="/infographics"
  icon={ImageIcon}  // from @radix-ui/react-icons
  label="Infographics"
  activeClassName="bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 shadow-sm"
/>
```

Use `ImageIcon` from `@radix-ui/react-icons`. If not available, use a suitable alternative.

### List Route

```tsx
// apps/web/src/routes/_protected/infographics/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { InfographicListContainer } from '@/features/infographics/components/infographic-list-container';

export const Route = createFileRoute('/_protected/infographics/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.infographics.list.queryOptions({ input: {} }),
    ),
  component: InfographicsPage,
});

function InfographicsPage() {
  useEffect(() => {
    document.title = 'Infographics - Content Studio';
  }, []);

  return <InfographicListContainer />;
}
```

### Detail Route

```tsx
// apps/web/src/routes/_protected/infographics/$infographicId.tsx
export const Route = createFileRoute('/_protected/infographics/$infographicId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.infographics.get.queryOptions({ input: { id: params.infographicId } }),
    ),
  component: InfographicDetailPage,
});
```

### List Container

Container handles:
- Data fetching via `useInfographicList` hook
- Create mutation (creates metadata → navigates to workbench)
- Delete mutation with ConfirmationDialog
- Navigation to workbench on card click

### List Presenter

Presenter receives props:
```typescript
interface InfographicListProps {
  infographics: InfographicOutput[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  isCreating: boolean;
}
```

Shows:
- Card grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- Each card: thumbnail preview (or placeholder if no image), title, type badge, format badge, relative date
- Create card/button: "New Infographic" with + icon
- Empty state when no infographics

### Data Fetching Hook

```typescript
// use-infographic-list.ts
export const useInfographicList = () => {
  return useSuspenseQuery(
    apiClient.infographics.list.queryOptions({ input: {} }),
  );
};
```

### Actions Hook

```typescript
// use-infographic-actions.ts
export const useInfographicActions = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createMutation = useMutation({
    ...apiClient.infographics.create.mutationOptions(),
    onSuccess: (infographic) => {
      queryClient.invalidateQueries({ queryKey: ['infographics'] });
      navigate({ to: '/infographics/$infographicId', params: { infographicId: infographic.id } });
    },
  });

  const deleteMutation = useMutation({
    ...apiClient.infographics.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infographics'] });
    },
  });

  return { createMutation, deleteMutation };
};
```

### Accessibility
- Delete button: `aria-label={`Delete ${infographic.title}`}`
- Create button: `aria-label="Create new infographic"`
- Card grid: appropriate heading hierarchy
- All images: `alt` text (title + type)
- Type/format badges: readable text, not just icons

## Verification Log

<!-- Agent writes verification results here -->
