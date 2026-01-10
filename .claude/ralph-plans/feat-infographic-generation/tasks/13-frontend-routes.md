# Task 13: Frontend - Routes and Navigation

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/frontend/project-structure.md`
- [ ] `apps/web/src/routes/_protected/podcasts/` - Reference routes
- [ ] `apps/web/src/routes/_protected/voiceovers/` - Reference routes

## Context

TanStack Router is used for routing. Key patterns:
- Route loaders use `ensureQueryData` for SSR
- Protected routes under `_protected/` require authentication
- Route files export `Route` from `createFileRoute`

## Key Files

### Create New Files:
- `apps/web/src/routes/_protected/infographics/index.tsx` - List route
- `apps/web/src/routes/_protected/infographics/new.tsx` - Create route
- `apps/web/src/routes/_protected/infographics/$infographicId.tsx` - Detail route

### Modify Existing Files:
- `apps/web/src/components/layout/sidebar.tsx` or navigation component - Add nav item

## Implementation Notes

### List Route (index.tsx)

```typescript
// apps/web/src/routes/_protected/infographics/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { InfographicListContainer } from '@/features/infographics/components/infographic-list-container';
import { getInfographicListQueryKey } from '@/features/infographics/hooks/use-infographic-list';

export const Route = createFileRoute('/_protected/infographics/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: getInfographicListQueryKey(),
      queryFn: () => context.apiClient.infographics.list({ limit: 20, offset: 0 }),
    });
  },
  component: InfographicsPage,
});

function InfographicsPage() {
  return (
    <div className="container mx-auto py-6">
      <InfographicListContainer />
    </div>
  );
}
```

### Create Route (new.tsx)

```typescript
// apps/web/src/routes/_protected/infographics/new.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useDocumentList } from '@/features/documents/hooks/use-document-list';
import { useCreateInfographic } from '@/features/infographics/hooks/use-create-infographic';
import { INFOGRAPHIC_TYPES } from '@/features/infographics/constants';

export const Route = createFileRoute('/_protected/infographics/new')({
  component: NewInfographicPage,
});

function NewInfographicPage() {
  const navigate = useNavigate();
  const { data: documents } = useDocumentList();
  const createMutation = useCreateInfographic();

  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!title || !selectedType || selectedDocs.length === 0) return;

    const result = await createMutation.mutateAsync({
      title,
      infographicType: selectedType,
      documentIds: selectedDocs,
    });

    navigate({ to: '/infographics/$infographicId', params: { infographicId: result.id } });
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create New Infographic</h1>

      {/* Title input */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter infographic title"
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      {/* Type selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Infographic Type</label>
        <div className="grid grid-cols-2 gap-3">
          {INFOGRAPHIC_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-3 border rounded-md text-left ${
                selectedType === type.id ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="font-medium">{type.name}</div>
              <div className="text-sm text-muted-foreground">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Document selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Select Documents ({selectedDocs.length} selected)
        </label>
        <div className="border rounded-md max-h-64 overflow-y-auto">
          {documents?.items.map((doc) => (
            <label
              key={doc.id}
              className="flex items-center p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={selectedDocs.includes(doc.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDocs([...selectedDocs, doc.id]);
                  } else {
                    setSelectedDocs(selectedDocs.filter((id) => id !== doc.id));
                  }
                }}
                className="mr-3"
              />
              <span>{doc.title}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!title || !selectedType || selectedDocs.length === 0 || createMutation.isPending}
        className="w-full py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
      >
        {createMutation.isPending ? 'Creating...' : 'Create Infographic'}
      </button>
    </div>
  );
}
```

### Detail Route ($infographicId.tsx)

```typescript
// apps/web/src/routes/_protected/infographics/$infographicId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { InfographicDetailContainer } from '@/features/infographics/components/infographic-detail-container';
import { getInfographicQueryKey } from '@/features/infographics/hooks/use-infographic';

export const Route = createFileRoute('/_protected/infographics/$infographicId')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      queryKey: getInfographicQueryKey(params.infographicId),
      queryFn: () => context.apiClient.infographics.get({ id: params.infographicId }),
    });
  },
  component: InfographicDetailPage,
});

function InfographicDetailPage() {
  const { infographicId } = Route.useParams();

  return <InfographicDetailContainer infographicId={infographicId} />;
}
```

### Navigation Update

Add to sidebar navigation:

```typescript
// In sidebar or navigation component
const navItems = [
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Podcasts', href: '/podcasts', icon: Mic },
  { label: 'Voiceovers', href: '/voiceovers', icon: Volume2 },
  { label: 'Infographics', href: '/infographics', icon: Image },  // ADD THIS
];
```

## Verification Log

<!-- Agent writes verification results here -->
