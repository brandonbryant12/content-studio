# Content Studio - Claude Code Instructions

## Before Making Changes

**Always search the `standards/` directory before implementing changes or creating plans.**

Relevant standards to consult based on the work area:

| Area | Standards |
|------|-----------|
| Backend logic | `standards/patterns/use-case.md`, `standards/patterns/repository.md` |
| API endpoints | `standards/patterns/router-handler.md`, `standards/patterns/serialization.md` |
| Error handling | `standards/patterns/error-handling.md` |
| Frontend components | `standards/frontend/components.md`, `standards/frontend/styling.md` |
| Data fetching | `standards/frontend/data-fetching.md`, `standards/frontend/mutations.md` |
| Forms | `standards/frontend/forms.md` |
| Testing | `standards/testing/use-case-tests.md`, `standards/testing/integration-tests.md`, `standards/frontend/testing.md` |
| Implementation plans | `standards/implementation-plan.md` |

Use `Glob` with pattern `standards/**/*.md` to find all available standards, then read the relevant ones before proceeding.

## Quick Reference

- **Monorepo**: pnpm workspaces with Turborepo
- **Backend**: Effect TS, Hono, Drizzle ORM
- **Frontend**: React, TanStack Query/Router/Form, Tailwind CSS
- **Testing**: Vitest, MSW, Playwright

## Validation Commands

```bash
pnpm typecheck    # Type check all packages
pnpm test         # Run all tests
pnpm build        # Build all packages
pnpm lint         # Lint all packages
```
