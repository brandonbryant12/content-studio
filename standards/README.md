# Technical Standards

Architectural patterns, coding standards, and implementation guidelines for Content Studio.

## Quick Navigation

| Standard | Description |
|------|-------------|
| [Setup Guide](./setup.md) | Requirements and development setup |
| [Repository Pattern](./patterns/repository.md) | Data access layer structure |
| [Use Case Pattern](./patterns/use-case.md) | Business logic structure |
| [Router Handler Pattern](./patterns/router-handler.md) | API handler structure |
| [Serialization Pattern](./patterns/serialization.md) | Converting DB entities to API responses |
| [Error Handling](./patterns/error-handling.md) | Defining and handling errors |
| [Use Case Tests](./testing/use-case-tests.md) | Unit testing use cases |
| [Integration Tests](./testing/integration-tests.md) | Testing API routers |
| **Frontend** | |
| [Frontend Overview](./frontend/README.md) | Frontend specs navigation |
| [Project Structure](./frontend/project-structure.md) | Feature-based organization |
| [Components](./frontend/components.md) | Container/Presenter pattern |
| [Styling](./frontend/styling.md) | Modern/Bold design system |
| [Data Fetching](./frontend/data-fetching.md) | TanStack Query patterns |
| [Mutations](./frontend/mutations.md) | Optimistic update patterns |
| [Real-Time](./frontend/real-time.md) | SSE and query invalidation |
| [Forms](./frontend/forms.md) | TanStack Form patterns |
| [Suspense](./frontend/suspense.md) | Loading and error boundaries |
| [Frontend Errors](./frontend/error-handling.md) | Client-side error handling |
| [Frontend Testing](./frontend/testing.md) | Integration testing with MSW |

## Core Principles

1. **One use case per handler** - Handlers orchestrate; use cases contain logic
2. **Effect-based serialization** - Always use Effect variants for tracing
3. **Protocol-based errors** - Errors define their own HTTP behavior
4. **Explicit dependencies** - Effect types declare all requirements

## Directory Structure

```
standards/
├── README.md                  # This file
├── setup.md                   # Requirements and setup guide
├── patterns/                  # Backend architectural patterns
│   ├── repository.md          # Data access layer
│   ├── use-case.md            # Business logic structure
│   ├── router-handler.md      # API handler structure
│   ├── serialization.md       # Data transformation
│   └── error-handling.md      # Error definition and handling
├── testing/                   # Backend testing guidelines
│   ├── use-case-tests.md      # Unit test patterns
│   └── integration-tests.md   # Integration test patterns
└── frontend/                  # Frontend guidelines
    ├── README.md              # Frontend specs navigation
    ├── project-structure.md   # Feature-based organization
    ├── components.md          # Container/Presenter pattern
    ├── styling.md             # Modern/Bold design system
    ├── data-fetching.md       # TanStack Query patterns
    ├── mutations.md           # Optimistic update patterns
    ├── real-time.md           # SSE and query invalidation
    ├── forms.md               # TanStack Form patterns
    ├── suspense.md            # Loading and error boundaries
    ├── error-handling.md      # Client-side error handling
    └── testing.md             # Integration testing with MSW
```

## Usage

These standards are the authoritative source for patterns in this codebase. When implementing new features:

1. Review relevant standards before starting
2. Follow the established structure exactly
3. Use the provided templates as starting points
4. Validate against the testing standards

## Validation Commands

```bash
# Type check all packages
pnpm typecheck

# Run all tests
pnpm test

# Build all packages
pnpm build
```
