# Frontend Standards

Architectural patterns, coding standards, and implementation guidelines for the Content Studio frontend.

## Quick Navigation

| Standard | Description |
|------|-------------|
| [Project Structure](./project-structure.md) | Feature-based directory organization |
| [Components](./components.md) | Container/Presenter pattern |
| [Styling](./styling.md) | Design tokens and Tailwind patterns |
| [Data Fetching](./data-fetching.md) | TanStack Query patterns |
| [Mutations](./mutations.md) | Optimistic update patterns |
| [Real-Time](./real-time.md) | SSE and query invalidation |
| [Forms](./forms.md) | TanStack Form patterns |
| [Suspense](./suspense.md) | Loading and error boundaries |
| [Error Handling](./error-handling.md) | Client-side error handling |
| [Testing](./testing.md) | Integration testing with MSW |

## Core Principles

1. **Feature-based organization** - Group code by domain, not by type
2. **Container/Presenter pattern** - Separate data from UI
3. **Optimistic-first mutations** - Show changes immediately, rollback on error
4. **Integration-first testing** - Test features, not implementation details
5. **Suspense boundaries** - Consistent loading and error states
6. **SSE for real-time** - Global listener invalidates queries

## Design Philosophy

Content Studio uses a **Modern/Bold** design aesthetic:

- Strong colors with confident contrast
- Clear typography hierarchy
- Purposeful micro-animations
- Premium feel without being heavy

## Directory Structure

```
apps/web/src/
├── features/               # Feature modules
│   ├── podcasts/
│   │   ├── components/     # Container + Presenter components
│   │   ├── hooks/          # Feature-specific hooks
│   │   └── index.ts        # Public exports
│   └── documents/
│       └── ...
├── shared/                 # Cross-cutting code
│   ├── components/         # Shared UI components
│   ├── hooks/              # Shared hooks
│   └── lib/                # Utilities
├── routes/                 # TanStack Router file-based routes
├── clients/                # API and auth clients
└── providers/              # React context providers
```

## Key Patterns

### Data Flow

```
Route (loader prefetch)
  └── Container (useSuspenseQuery, mutations)
        └── Presenter (pure UI, props only)
```

### Optimistic + SSE

```
User Action → Optimistic Update → Mutation → SSE Event → Query Invalidation
                    ↑                              ↓
                    └──────── Rollback on Error ───┘
```

## Validation Commands

```bash
# Type check
pnpm --filter web typecheck

# Run tests
pnpm --filter web test

# Build
pnpm --filter web build

# Lint
pnpm --filter web lint
```
