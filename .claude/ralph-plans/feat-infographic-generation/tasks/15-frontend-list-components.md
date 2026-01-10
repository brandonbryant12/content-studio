# Task 15: Frontend - List Components

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/frontend/components.md`
- [ ] `standards/frontend/styling.md`
- [ ] `apps/web/src/features/podcasts/components/podcast-list*.tsx` - Reference

## Context

Follow Container/Presenter pattern:
- Container handles data fetching, state, mutations
- Presenter is pure UI, receives props
- Use Tailwind for styling
- Follow Modern/Bold design system

## Key Files

### Create New Files:
- `apps/web/src/features/infographics/components/infographic-list-container.tsx`
- `apps/web/src/features/infographics/components/infographic-list.tsx`
- `apps/web/src/features/infographics/components/infographic-item.tsx`
- `apps/web/src/features/infographics/components/infographic-icon.tsx`

## Implementation Notes

### Container

```typescript
// apps/web/src/features/infographics/components/infographic-list-container.tsx
import { useState, Suspense } from 'react';
import { useInfographicList } from '../hooks/use-infographic-list';
import { useDeleteInfographic } from '../hooks/use-delete-infographic';
import { InfographicList } from './infographic-list';
import { InfographicListSkeleton } from './infographic-list-skeleton';

export function InfographicListContainer() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useDeleteInfographic();

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Suspense fallback={<InfographicListSkeleton />}>
      <InfographicListContent deletingId={deletingId} onDelete={handleDelete} />
    </Suspense>
  );
}

function InfographicListContent({
  deletingId,
  onDelete,
}: {
  deletingId: string | null;
  onDelete: (id: string) => void;
}) {
  const { data } = useInfographicList();

  return (
    <InfographicList
      infographics={data.items}
      deletingId={deletingId}
      onDelete={onDelete}
    />
  );
}
```

### Presenter (List)

```typescript
// apps/web/src/features/infographics/components/infographic-list.tsx
import { Link } from '@tanstack/react-router';
import { Plus, Image } from 'lucide-react';
import { InfographicItem, type InfographicListItem } from './infographic-item';
import { Button } from '@/components/ui/button';

interface InfographicListProps {
  infographics: InfographicListItem[];
  deletingId: string | null;
  onDelete: (id: string) => void;
}

export function InfographicList({
  infographics,
  deletingId,
  onDelete,
}: InfographicListProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Infographics</h1>
          <p className="text-muted-foreground">
            Create visual summaries from your documents
          </p>
        </div>
        <Button asChild>
          <Link to="/infographics/new">
            <Plus className="w-4 h-4 mr-2" />
            New Infographic
          </Link>
        </Button>
      </div>

      {/* Grid */}
      {infographics.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {infographics.map((infographic) => (
            <InfographicItem
              key={infographic.id}
              infographic={infographic}
              isDeleting={deletingId === infographic.id}
              onDelete={() => onDelete(infographic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 border-2 border-dashed rounded-lg">
      <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No infographics yet</h3>
      <p className="text-muted-foreground mb-4">
        Create your first infographic from your documents
      </p>
      <Button asChild>
        <Link to="/infographics/new">
          <Plus className="w-4 h-4 mr-2" />
          Create Infographic
        </Link>
      </Button>
    </div>
  );
}
```

### Item Component

```typescript
// apps/web/src/features/infographics/components/infographic-item.tsx
import { Link } from '@tanstack/react-router';
import { Trash2, Loader2 } from 'lucide-react';
import { InfographicIcon } from './infographic-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface InfographicListItem {
  id: string;
  title: string;
  status: string;
  infographicType: string;
  imageUrl: string | null;
  createdAt: string;
}

interface InfographicItemProps {
  infographic: InfographicListItem;
  isDeleting: boolean;
  onDelete: () => void;
}

export function InfographicItem({
  infographic,
  isDeleting,
  onDelete,
}: InfographicItemProps) {
  return (
    <div className="group relative border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <Link
        to="/infographics/$infographicId"
        params={{ infographicId: infographic.id }}
        className="block"
      >
        <div className="aspect-video bg-muted relative">
          {infographic.imageUrl ? (
            <img
              src={infographic.imageUrl}
              alt={infographic.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <InfographicIcon
                type={infographic.infographicType}
                className="w-12 h-12 text-muted-foreground"
              />
            </div>
          )}

          {/* Status overlay for generating */}
          {infographic.status === 'generating' && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/infographics/$infographicId"
              params={{ infographicId: infographic.id }}
              className="font-medium truncate block hover:text-primary"
            >
              {infographic.title}
            </Link>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span className="capitalize">{infographic.infographicType}</span>
              <span>•</span>
              <span>{new Date(infographic.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <StatusBadge status={infographic.status} />
        </div>
      </div>

      {/* Delete button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Infographic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{infographic.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### Icon Component

```typescript
// apps/web/src/features/infographics/components/infographic-icon.tsx
import {
  Clock,
  Columns,
  BarChart3,
  GitBranch,
  List,
  Share2,
  Layers,
  Map,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  timeline: Clock,
  comparison: Columns,
  statistical: BarChart3,
  process: GitBranch,
  list: List,
  mindMap: Share2,
  hierarchy: Layers,
  geographic: Map,
};

interface InfographicIconProps {
  type: string;
  className?: string;
}

export function InfographicIcon({ type, className }: InfographicIconProps) {
  const Icon = ICONS[type] ?? Image;
  return <Icon className={cn('w-5 h-5', className)} />;
}
```

### Skeleton

```typescript
// apps/web/src/features/infographics/components/infographic-list-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function InfographicListSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg overflow-hidden">
            <Skeleton className="aspect-video" />
            <div className="p-3">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Verification Log

<!-- Agent writes verification results here -->
