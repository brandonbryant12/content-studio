# Frontend Architecture

Type-safe React frontend with oRPC integration, TanStack Router/Query, and component organization patterns.

## Stack

| Component | Technology | Role |
|-----------|------------|------|
| Framework | React 19 | UI library |
| Routing | TanStack Router | File-based routing |
| Data Fetching | TanStack Query | Server state management |
| API Client | oRPC | Type-safe RPC calls |
| Styling | Tailwind CSS | Utility-first CSS |
| UI Primitives | @repo/ui (Radix) | Shared component library |

## Directory Structure

```
apps/web/src/
├── clients/
│   ├── apiClient.ts          # oRPC client instance
│   ├── queryClient.ts        # TanStack Query client
│   ├── query-helpers.ts      # Query invalidation utilities
│   └── authClient.ts         # Authentication client
├── lib/
│   └── formatters.ts         # Shared formatting utilities
├── routes/
│   ├── -components/          # Shared route components
│   │   └── common/           # App-wide components
│   └── _protected/           # Authenticated routes
│       ├── documents/
│       │   ├── -components/  # Document-specific components
│       │   └── index.tsx     # Documents list page
│       ├── podcasts/
│       │   ├── -components/  # Podcast-specific components
│       │   ├── -constants/   # Podcast constants/config
│       │   ├── $podcastId/   # Dynamic route
│       │   └── index.tsx     # Podcasts list page
│       └── projects/
│           ├── -components/  # Project-specific components
│           │   └── podcast/  # Podcast creation components
│           └── index.tsx     # Projects list page
└── env.ts                    # Environment configuration
```

### Naming Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `-components/` | Route-scoped components | `podcasts/-components/` |
| `-constants/` | Route-scoped config/types | `podcasts/-constants/` |
| `$param/` | Dynamic route segments | `$podcastId/` |
| `_layout/` | Layout routes | `_protected/` |

## Type-Safe API with oRPC

### Architecture

```
Contract (packages/api/src/contracts/)
    └── Valibot schemas define input/output types
           │
           ▼
Client (packages/api/src/client/)
    └── createTanstackQueryAPIClient() generates typed utilities
           │
           ▼
Frontend (apps/web/src/clients/apiClient.ts)
    └── Automatic type inference - no manual typing needed
```

### Client Setup

```typescript
// apps/web/src/clients/apiClient.ts
import { createTanstackQueryAPIClient } from '@repo/api/client';

export const apiClient = createTanstackQueryAPIClient({
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
});
```

### Automatic Type Safety

The oRPC client provides **full type inference** automatically. Query and mutation data is typed without any manual type annotations:

```typescript
// ✅ Data is automatically typed from the contract
const { data: podcasts } = useQuery(
  apiClient.podcasts.list.queryOptions({ input: {} }),
);
// podcasts is already typed as the list output schema

const { data: podcast } = useQuery(
  apiClient.podcasts.get.queryOptions({ input: { id } }),
);
// podcast is already typed as the full podcast schema
```

### When You Need Explicit Types

Use `RouterOutput` only when typing component props or variables outside query context:

```typescript
import type { RouterOutput } from '@repo/api/client';

// For component props that receive data from parent
type Document = RouterOutput['projects']['get']['documents'][number];

function DocumentItem({ document }: { document: Document }) {...}
```

**Prefer inline prop types when possible:**
```typescript
// Let TypeScript infer from usage
function PodcastItem({
  podcast,
}: {
  podcast: RouterOutput['podcasts']['list'][number];
}) {...}
```

### Query Patterns

**Basic Query:**
```typescript
const { data: podcasts, isPending } = useQuery(
  apiClient.podcasts.list.queryOptions({ input: {} }),
);
```

**Query with Variables:**
```typescript
const { data: podcast } = useQuery(
  apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
);
```

**Polling/Refetch:**
```typescript
const { data: podcast } = useQuery({
  ...apiClient.podcasts.get.queryOptions({ input: { id } }),
  refetchInterval: (query) => {
    // Poll while generating
    const status = query.state.data?.status;
    if (status === 'generating_script') return 3000;
    return false;
  },
});
```

**Route Loader (Prefetch):**
```typescript
export const Route = createFileRoute('/_protected/podcasts/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.podcasts.list.queryOptions({ input: {} }),
    ),
  component: PodcastsPage,
});
```

### Mutation Patterns

**Basic Mutation:**
```typescript
const deleteMutation = useMutation(
  apiClient.podcasts.delete.mutationOptions({
    onSuccess: async () => {
      await invalidateQueries('podcasts', 'projects');
      toast.success('Podcast deleted');
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to delete podcast');
    },
  }),
);

// Usage
deleteMutation.mutate({ id: podcastId });
```

**Chained Mutations:**
```typescript
const generateMutation = useMutation(
  apiClient.podcasts.generate.mutationOptions({...}),
);

const createMutation = useMutation(
  apiClient.podcasts.create.mutationOptions({
    onSuccess: async (podcast) => {
      // Chain: trigger generation after creation
      generateMutation.mutate({ id: podcast.id });
      await invalidateQueries('podcasts', 'projects');
    },
  }),
);
```

### Query Invalidation

Use the centralized helper for consistent invalidation:

```typescript
// apps/web/src/clients/query-helpers.ts
import { invalidateQueries } from '@/clients/query-helpers';

// Invalidate single domain
await invalidateQueries('podcasts');

// Invalidate multiple domains
await invalidateQueries('podcasts', 'projects', 'documents');
```

**Adding New Query Keys:**
```typescript
// Update the type when adding new API domains
type QueryKeyPrefix = 'podcasts' | 'documents' | 'projects' | 'voices' | 'newDomain';
```

## Component Organization

### Extraction Rules

| File Size | Action |
|-----------|--------|
| < 150 lines | Keep inline |
| 150-300 lines | Consider extraction |
| > 300 lines | Extract components |

### Component Placement

**@repo/ui (packages/ui/):**
- Generic, reusable UI primitives
- No domain logic
- Examples: Badge, Button, Dialog, Spinner, EmptyState, Select

**Route `-components/`:**
- Domain-specific components
- Depend on API types
- Examples: PodcastItem, DocumentPicker, StatusDisplay

### Extraction Patterns

**Before (large file):**
```typescript
// podcasts/index.tsx - 300+ lines
function StatusBadge({...}) {...}
function PodcastIcon({...}) {...}
function PodcastItem({...}) {...}
function EmptyState({...}) {...}
function PodcastsPage() {...}
```

**After (organized):**
```
podcasts/
├── -components/
│   ├── podcast-icon.tsx
│   └── podcast-item.tsx      # includes StatusBadge, FormatBadge
├── -constants/
│   └── status.ts             # status config, helpers
└── index.tsx                 # ~120 lines
```

### Shared Configuration

Extract constants when used across multiple files:

```typescript
// podcasts/-constants/status.ts
import type { RouterOutput } from '@repo/api/client';
import type { BadgeVariant } from '@repo/ui/components/badge';

export type PodcastStatus = RouterOutput['podcasts']['get']['status'];

export const PODCAST_STATUS_CONFIG: Record<PodcastStatus, StatusConfig> = {
  draft: { label: 'Draft', badgeVariant: 'default' },
  generating_script: { label: 'Writing Script', badgeVariant: 'info' },
  // ...
};

export function isGeneratingStatus(status: PodcastStatus): boolean {
  return status === 'generating_script' || status === 'generating_audio';
}
```

## @repo/ui Usage

### Available Components

```typescript
// Import from package paths
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Dialog, DialogContent } from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Select } from '@repo/ui/components/select';
import { Spinner } from '@repo/ui/components/spinner';
import { EmptyState } from '@repo/ui/components/empty-state';
```

### When to Add to @repo/ui

Add to @repo/ui when:
- Component is generic (no domain types)
- Used across 2+ unrelated features
- Follows existing component patterns

Keep in app when:
- Depends on `RouterOutput` types
- Domain-specific styling/behavior
- Only used in one feature area

## Utility Functions

### Formatters

```typescript
// apps/web/src/lib/formatters.ts
import { formatDuration, formatFileSize } from '@/lib/formatters';

formatDuration(125);        // "2:05"
formatFileSize(1024 * 500); // "500.0 KB"
```

### Adding Formatters

```typescript
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}
```

## File Conventions

### Component Files

```typescript
// document-item.tsx
import type { RouterOutput } from '@repo/api/client';
import { Button } from '@repo/ui/components/button';
import { formatFileSize } from '@/lib/formatters';

// Private helper (not exported)
function formatSource(source: string) {...}

// Exported component
export function DocumentItem({ document, onDelete }: Props) {...}
```

### Route Files

```typescript
// index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DocumentItem } from './-components/document-item';

export const Route = createFileRoute('/_protected/documents/')({
  loader: () => {...},
  component: DocumentsPage,
});

// Page-specific components (not worth extracting)
function EmptyState() {...}

// Main page component
function DocumentsPage() {...}
```

## Type Safety Checklist

1. **Let oRPC Infer**: Don't manually type query/mutation data - it's automatic
2. **Props from Parent**: Use `RouterOutput` only for component props receiving API data
3. **Query Invalidation**: Use typed `invalidateQueries` helper
4. **Mutation Input**: Types are enforced by the client - invalid input won't compile
5. **Status/Enums**: Derive from `RouterOutput` when needed, don't hardcode values

## Common Patterns

### List Page Structure

```typescript
function ListPage() {
  const [search, setSearch] = useState('');

  const { data, isPending } = useQuery(
    apiClient.entities.list.queryOptions({ input: {} }),
  );

  const deleteMutation = useMutation(
    apiClient.entities.delete.mutationOptions({
      onSuccess: () => invalidateQueries('entities'),
    }),
  );

  const filtered = data?.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  if (isPending) return <Spinner />;
  if (!filtered?.length) return <EmptyState />;

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      {filtered.map(item => (
        <EntityItem
          key={item.id}
          entity={item}
          onDelete={() => deleteMutation.mutate({ id: item.id })}
        />
      ))}
    </div>
  );
}
```

### Dialog Pattern with BaseDialog

Use `BaseDialog` for consistent dialog styling and behavior:

```typescript
import { BaseDialog } from '@/components/base-dialog';

function CreateEntityDialog({ open, onOpenChange }: Props) {
  const [formState, setFormState] = useState(initialState);

  useEffect(() => {
    if (open) setFormState(initialState);
  }, [open]);

  const createMutation = useMutation(
    apiClient.entities.create.mutationOptions({
      onSuccess: async () => {
        await invalidateQueries('entities');
        onOpenChange(false);
        toast.success('Created!');
      },
    }),
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Entity"
      description="Optional description"
      maxWidth="lg"  // 'sm' | 'md' | 'lg' | 'xl'
      scrollable     // For long content
      footer={{
        submitText: 'Create',
        loadingText: 'Creating...',
        submitDisabled: !formState.isValid,
        onSubmit: () => createMutation.mutate(formState),
        isLoading: createMutation.isPending,
      }}
    >
      {/* Form content */}
    </BaseDialog>
  );
}
```

## Custom Hooks

Location: `apps/web/src/hooks/`

### Available Hooks

| Hook | Purpose |
|------|---------|
| `useQueryInvalidation` | Cache invalidation by entity type |
| `useSessionGuard` | Authentication state and guards |
| `usePodcastGeneration` | Podcast creation and generation mutations |

```typescript
import { useQueryInvalidation, useSessionGuard } from '@/hooks';

// Cache invalidation
const { invalidatePodcasts, invalidateProjects, invalidate } = useQueryInvalidation();
await invalidate('podcasts', 'projects');

// Session guard
const { user, isAuthenticated, isPending, session } = useSessionGuard();
```

## Error Boundaries

Location: `apps/web/src/components/error-boundary/`

Error boundaries catch React errors and display a fallback UI with retry option.

### Integration Points

- **Root layout** (`__root.tsx`): Catches app-wide errors
- **Protected layout** (`_protected/layout.tsx`): Resets on user change

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary
  resetKeys={[userId]}           // Reset when these values change
  onError={(error) => logError(error)}
  FallbackComponent={CustomFallback}  // Optional custom fallback
>
  {children}
</ErrorBoundary>
```

### Default Error Fallback

The default `ErrorFallback` displays:
- Error icon
- Error message
- "Try Again" button
- Stack trace (dev mode only)

## Constants

Location: `apps/web/src/constants.ts`

Centralize app-wide constants:

```typescript
import { APP_NAME, APP_VERSION, APP_NAME_WITH_VERSION } from '@/constants';

// Available constants
APP_NAME           // 'PodcastAI'
APP_VERSION        // '1.0'
APP_NAME_WITH_VERSION  // 'PodcastAI v1.0'
```

## Accessibility

### ARIA Labels

- Add `aria-label` to icon-only buttons
- Use `role="checkbox"` and `aria-checked` for custom checkboxes
- Ensure form inputs have associated `<Label>` components

```typescript
// Icon button
<button aria-label="Delete item" onClick={onDelete}>
  <TrashIcon />
</button>

// Custom checkbox
<button
  role="checkbox"
  aria-checked={checked}
  aria-label={`Select ${item.title}`}
  onClick={onToggle}
/>
```
