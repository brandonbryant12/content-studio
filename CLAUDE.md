# Content Studio - Claude Code Instructions

## Before Making Changes

**Always search `standards/` before implementing.** Use `Glob` with `standards/**/*.md` to find relevant standards.

| Area | Standards |
|------|-----------|
| Backend logic | `standards/patterns/use-case.md`, `standards/patterns/repository.md` |
| API endpoints | `standards/patterns/router-handler.md`, `standards/patterns/serialization.md` |
| Error handling | `standards/patterns/error-handling.md`, `standards/patterns/enum-constants.md` |
| Effect runtime | `standards/patterns/effect-runtime.md` |
| Frontend components | `standards/frontend/components.md`, `standards/frontend/styling.md` |
| Data fetching | `standards/frontend/data-fetching.md`, `standards/frontend/mutations.md` |
| Forms | `standards/frontend/forms.md` |
| Frontend architecture | `standards/frontend/project-structure.md`, `standards/frontend/suspense.md`, `standards/frontend/error-handling.md` |
| Real-time | `standards/frontend/real-time.md` |
| Testing | `standards/testing/use-case-tests.md`, `standards/testing/integration-tests.md`, `standards/testing/job-workflow-tests.md`, `standards/testing/live-tests.md`, `standards/frontend/testing.md` |
| Implementation plans | `standards/implementation-plan.md` |

## Project Structure

```
apps/
  server/          # Hono HTTP server — entry: src/server.ts
  web/             # React SPA (Vite + TanStack Router)
packages/
  ai/              # LLM + TTS providers (Google, OpenAI)
  api/             # oRPC contracts, router, handlers
  auth/            # better-auth integration
  db/              # Drizzle schema + migrations (PostgreSQL)
  media/           # Domain logic — podcasts, voiceovers, documents, infographics
  queue/           # Job queue (BullMQ-style)
  storage/         # S3-compatible file storage
  testing/         # Shared test utilities
  ui/              # Radix UI + Tailwind component library
```

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Effect TS, Hono, oRPC, Drizzle ORM
- **Frontend**: React 19, TanStack Query/Router/Form, Tailwind CSS, Radix UI
- **Testing**: Vitest, MSW, Playwright

## Validation

```bash
pnpm typecheck    # Type check all packages (required before PR)
pnpm test         # Run all tests (includes web app tests)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm dev          # Start all dev servers (Turborepo watch mode)
pnpm db:push      # Push Drizzle schema to database
pnpm db:studio    # Open Drizzle Studio GUI
pnpm test:e2e     # Run Playwright e2e tests
pnpm test:db:setup # Start test DB container + push schema
```

## Effect Layer Rules

- **`Layer.succeed`** — only for pure object literals (repos, plain config). No `new` or factory calls.
- **`Layer.sync`** — when `make*` instantiates classes (`new GoogleGenAI(...)`) or calls factory functions
- **`Layer.effect`** — when construction needs to `yield*` other Effect services
- See `standards/patterns/effect-runtime.md` § "Layer Construction" for full guide

## DX & Tooling

- **All dependencies use `catalog:`** in package.json for version alignment via pnpm catalog
- **Mock repo factories** are in `packages/media/src/test-utils/` — use `createMockPodcastRepo(overrides)` instead of manually stubbing every method with `Effect.die`
- **Web app tests** are included in the vitest workspace — `pnpm test` runs them
- **Don't add jest/ts-jest** — this project uses Vitest exclusively
- **Root `package.json` only has workspace-level deps** — feature-specific deps go in the consuming package
