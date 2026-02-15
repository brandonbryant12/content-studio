# Content Studio - Claude Code Instructions

## Before Making Changes

**Always search `docs/` before implementing.** Use `Glob` with `docs/**/*.md` to find relevant docs.

| Area | Docs |
|------|------|
| Backend logic | `docs/patterns/use-case.md`, `docs/patterns/repository.md`, `docs/patterns/safety-primitives.md`, `docs/patterns/job-queue.md` |
| API endpoints | `docs/patterns/api-handler.md` |
| Error handling | `docs/patterns/error-handling.md`, `docs/patterns/enum-constants.md` |
| Effect runtime | `docs/patterns/effect-runtime.md` |
| Frontend components | `docs/frontend/components.md`, `docs/frontend/styling.md` |
| Data fetching | `docs/frontend/data-fetching.md`, `docs/frontend/mutations.md` |
| Forms | `docs/frontend/forms.md` |
| Frontend architecture | `docs/frontend/project-structure.md`, `docs/frontend/error-handling.md`, `docs/frontend/components.md` |
| Real-time | `docs/frontend/real-time.md` |
| Testing | `docs/testing/use-case-tests.md`, `docs/testing/integration-tests.md`, `docs/testing/job-workflow-tests.md`, `docs/testing/invariants.md`, `docs/testing/live-tests.md`, `docs/frontend/testing.md` |

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
  queue/           # Postgres-backed job queue
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
pnpm test:invariants # Safety invariants (must pass for agent-authored changes)
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
- See `docs/patterns/effect-runtime.md` § "Layer Construction" for full guide

## DX & Tooling

- **All dependencies use `catalog:`** in package.json for version alignment via pnpm catalog
- **Mock repo factories** are in `packages/media/src/test-utils/` — use `createMockPodcastRepo(overrides)` instead of manually stubbing every method with `Effect.die`
- **Web app tests** are included in the vitest workspace — `pnpm test` runs them
- **Don't add jest/ts-jest** — this project uses Vitest exclusively
- **Root `package.json` only has workspace-level deps** — feature-specific deps go in the consuming package
