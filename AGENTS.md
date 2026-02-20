# Content Studio - Agent Instructions

## Before Making Changes

**Always search `docs/` before implementing.** Use `Glob` with `docs/**/*.md` to find relevant docs.

| Area | Docs |
|------|------|
| Backend logic | `docs/patterns/use-case.md`, `docs/patterns/repository.md`, `docs/patterns/safety-primitives.md`, `docs/patterns/job-queue.md` |
| API endpoints | `docs/patterns/api-handler.md` |
| Error handling | `docs/patterns/error-handling.md`, `docs/patterns/enum-constants.md` |
| Effect runtime | `docs/patterns/effect-runtime.md` |
| Observability | `docs/architecture/observability.md`, `docs/setup.md` |
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

## AI Workflow + Skills

- **Follow `docs/workflow.md`** for intake, delivery, review, scans, release/incident, and self-improvement loops.
- **Persist compounding notes in `docs/workflow-memory/`** for every workflow run with findings or decisions (event JSONL + index update).
- Preferred memory write helper:
  - `node scripts/workflow-memory/add-entry.mjs --help`
- Preferred memory coverage helper:
  - `pnpm workflow-memory:coverage:strict`
- Preferred skill quality helper:
  - `pnpm skills:check:strict`
- **Canonical skills live in `.agents/skills/`**.
- **`.claude/skills`, `.agent/skills`, `.github/skills` must stay symlinked mirrors** of `.agents/skills`.
- After any skill add/update/delete, run:
  - `scripts/sync-skills.sh`
- Preferred project skills:
  - `code-simplifier`
  - `quality-closure-loop`
  - `codebase-nav`
  - `debug-fix`
  - `intake-triage`
  - `feature-delivery`
  - `frontend-design`
  - `pr-risk-review`
  - `test-surface-steward`
  - `architecture-adr-guard`
  - `periodic-scans`
  - `security-dependency-hygiene`
  - `performance-cost-guard`
  - `release-incident-response`
  - `docs-knowledge-drift`
  - `self-improvement`
  - `tanstack-vite`

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
pnpm skills:check:strict # Validate skill metadata, paths, and mirror symlinks
pnpm workflow-memory:coverage:strict # Verify monthly workflow-memory coverage baseline
```

## Regression Guardrails

- **Never hardcode query keys** for invalidation. Export/use `getXQueryKey()` helpers derived from `apiClient...queryOptions().queryKey`.
- **When Router preloading and Query caching are combined**, keep freshness in Query (`defaultPreloadStaleTime: 0` at router level unless route-specific override is intentional).
- **No unsafe production casts** like `as never` for API/mutation inputs. Prefer typed inputs/outputs at the contract boundary.
- **Chat streams must be concretely typed** (`UIMessageChunk`) in contracts. Avoid `eventIterator(type<unknown>())` for chat endpoints.
- **`useChat` streaming state must be explicit**: `status === 'submitted' || status === 'streaming'` (not `status !== 'ready'`).
- **All mutating use cases on existing resources must enforce authorization** (`requireOwnership` / role policy) before write/delete.
- **Sanitize user-editable structured fields before persistence or prompt composition** (trim, drop empty key/value entries, normalize types).
- **Query retry policy must be explicit**: disable retries for `*_NOT_FOUND` class errors; retry bounded times for transient failures.
- **Backend Effect error tests must assert `_tag` + fields**, not `toBeInstanceOf(...)` for domain/app errors (built-in classes like `URL`/`Buffer` are allowed).
- **Avoid aggressive Vite per-package `manualChunks` strategies** that create many tiny or empty chunks; prefer Router auto code splitting and targeted overrides only.
- **Telemetry is backend-only by default**: configure Datadog/OTLP in `apps/server` and `apps/worker`; do not add frontend client-side error telemetry unless explicitly requested.
- **Backend telemetry lifecycle must be explicit**: call `initTelemetry(...)` before starting server/worker and `shutdownTelemetry()` during graceful shutdown.
- **Use standard OTLP env inputs**: `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and optional `OTEL_EXPORTER_OTLP_HEADERS` (`KEY=value,KEY2=value2`).

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
