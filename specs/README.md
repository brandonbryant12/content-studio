# Content Studio Specifications

This directory contains the architectural patterns, coding standards, and testing guidelines for the Content Studio codebase.

## Quick Navigation

| Spec | Description |
|------|-------------|
| [Setup Guide](./setup.md) | Requirements and development setup |
| [Repository Pattern](./patterns/repository.md) | Data access layer structure |
| [Use Case Pattern](./patterns/use-case.md) | Business logic structure |
| [Router Handler Pattern](./patterns/router-handler.md) | API handler structure |
| [Serialization Pattern](./patterns/serialization.md) | Converting DB entities to API responses |
| [Error Handling](./patterns/error-handling.md) | Defining and handling errors |
| [Use Case Tests](./testing/use-case-tests.md) | Unit testing use cases |
| [Integration Tests](./testing/integration-tests.md) | Testing API routers |
| [Frontend Errors](./frontend/error-handling.md) | Handling errors in the web app |

## Core Principles

1. **One use case per handler** - Handlers orchestrate; use cases contain logic
2. **Effect-based serialization** - Always use Effect variants for tracing
3. **Protocol-based errors** - Errors define their own HTTP behavior
4. **Explicit dependencies** - Effect types declare all requirements

## Directory Structure

```
specs/
├── README.md              # This file
├── setup.md               # Requirements and setup guide
├── patterns/              # Architectural patterns
│   ├── repository.md      # Data access layer
│   ├── use-case.md        # Business logic structure
│   ├── router-handler.md  # API handler structure
│   ├── serialization.md   # Data transformation
│   └── error-handling.md  # Error definition and handling
├── testing/               # Testing guidelines
│   ├── use-case-tests.md  # Unit test patterns
│   └── integration-tests.md # Integration test patterns
└── frontend/              # Frontend guidelines
    └── error-handling.md  # Client-side error handling
```

## Usage

These specs are the authoritative source for patterns in this codebase. When implementing new features:

1. Review relevant pattern specs before starting
2. Follow the established structure exactly
3. Use the provided templates as starting points
4. Validate against the test patterns

## Validation Commands

```bash
# Type check all packages
pnpm typecheck

# Run all tests
pnpm test

# Build all packages
pnpm build
```
