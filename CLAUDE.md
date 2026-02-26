# Content Studio - Claude Code Instructions

## Before Making Changes

**Always search `docs/` before implementing.** Use `Glob` with [`docs/**/*.md`](./docs/) to find relevant docs.

| Area | Docs |
|------|------|
| Backend logic | [`docs/patterns/use-case.md`](./docs/patterns/use-case.md), [`docs/patterns/repository.md`](./docs/patterns/repository.md), [`docs/patterns/safety-primitives.md`](./docs/patterns/safety-primitives.md), [`docs/patterns/job-queue.md`](./docs/patterns/job-queue.md) |
| API endpoints | [`docs/patterns/api-handler.md`](./docs/patterns/api-handler.md) |
| Error handling | [`docs/patterns/error-handling.md`](./docs/patterns/error-handling.md), [`docs/patterns/enum-constants.md`](./docs/patterns/enum-constants.md) |
| Effect runtime | [`docs/patterns/effect-runtime.md`](./docs/patterns/effect-runtime.md) |
| Observability | [`docs/architecture/observability.md`](./docs/architecture/observability.md), [`docs/setup.md`](./docs/setup.md) |
| Frontend components | [`docs/frontend/components.md`](./docs/frontend/components.md), [`docs/frontend/styling.md`](./docs/frontend/styling.md) |
| Data fetching | [`docs/frontend/data-fetching.md`](./docs/frontend/data-fetching.md), [`docs/frontend/mutations.md`](./docs/frontend/mutations.md) |
| Forms | [`docs/frontend/forms.md`](./docs/frontend/forms.md) |
| Frontend architecture | [`docs/frontend/project-structure.md`](./docs/frontend/project-structure.md), [`docs/frontend/error-handling.md`](./docs/frontend/error-handling.md), [`docs/frontend/components.md`](./docs/frontend/components.md) |
| Real-time | [`docs/frontend/real-time.md`](./docs/frontend/real-time.md) |
| Testing | [`docs/testing/use-case-tests.md`](./docs/testing/use-case-tests.md), [`docs/testing/integration-tests.md`](./docs/testing/integration-tests.md), [`docs/testing/job-workflow-tests.md`](./docs/testing/job-workflow-tests.md), [`docs/testing/invariants.md`](./docs/testing/invariants.md), [`docs/testing/live-tests.md`](./docs/testing/live-tests.md), [`docs/frontend/testing.md`](./docs/frontend/testing.md) |

## Project Structure

```
apps/
  server/          # Hono HTTP server — entry: src/server.ts
  web/             # React SPA (Vite + TanStack Router)
  worker/          # Background worker — entry: src/worker.ts
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

- **Follow [`agent-engine/workflows/README.md`](./agent-engine/workflows/README.md)** for workflow selection and distinctions.
- **Persist compounding notes in `agent-engine/workflow-memory/`** for every workflow run with findings or decisions (event JSONL + index update).
- Preferred memory write helper:
  - `pnpm workflow-memory:add-entry --help`
- Preferred memory git persistence helper:
  - `pnpm workflow-memory:sync --help`
- Preferred memory retrieval helper (ranked by scoring fields):
  - `pnpm workflow-memory:retrieve --help`
- Use only core workflow keys for workflow-memory entries; record utility skills as tags (for example, `skill:intake-triage`).
- For memory-related or agent-run diagnostic events, use canonical taxonomy tags from [`agent-engine/workflow-memory/taxonomy.md`](./agent-engine/workflow-memory/taxonomy.md).
- Preferred memory coverage helper:
  - `pnpm workflow-memory:coverage:strict`
  - If `coverage:strict` fails in an active quality loop due to missing monthly workflow classes, run those workflow passes and append events in the same cycle before closing.
- Preferred skill quality helper:
  - `pnpm skills:check:strict`
- **Canonical skills live in `.agents/skills/`**.
- **`.claude/skills`, `.agent/skills`, `.github/skills` must stay symlinked mirrors** of `.agents/skills`.
- After any skill add/update/delete, run:
  - `agent-engine/scripts/sync-skills.sh`
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
pnpm test:scripts # Script guardrail tests (included in pnpm test)
pnpm test:invariants # Safety invariants (must pass for agent-authored changes)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm scripts:lint # Script lint/guardrails for agent-engine scripts
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
- **Use `Effect.forkDaemon` (not `Effect.fork`) when forking long-lived fibers** from `ManagedRuntime.runPromise`. `Effect.fork` scopes to the caller—the fiber is immediately interrupted when `runPromise` returns. See `docs/patterns/effect-runtime.md` § "Forking Long-Lived Fibers".
- **Avoid aggressive Vite per-package `manualChunks` strategies** that create many tiny or empty chunks; prefer Router auto code splitting and targeted overrides only.
- **Telemetry is backend-only by default**: configure Datadog/OTLP in `apps/server` and `apps/worker`; do not add frontend client-side error telemetry unless explicitly requested.
- **Backend telemetry lifecycle must be explicit**: call `initTelemetry(...)` before starting server/worker and `shutdownTelemetry()` during graceful shutdown.
- **Use standard OTLP env inputs**: `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and optional `OTEL_EXPORTER_OTLP_HEADERS` (`KEY=value,KEY2=value2`).

## Effect Layer Rules

- **`Layer.succeed`** — only for pure object literals (repos, plain config). No `new` or factory calls.
- **`Layer.sync`** — when `make*` instantiates classes (`new GoogleGenAI(...)`) or calls factory functions
- **`Layer.effect`** — when construction needs to `yield*` other Effect services
- See [`docs/patterns/effect-runtime.md`](./docs/patterns/effect-runtime.md) § "Layer Construction" for full guide

## DX & Tooling

- **Prefer `catalog:` for shared dependency versions** in package.json for pnpm catalog alignment; explicit versions are allowed for package-specific dependencies.
- **Mock repo factories** are in `packages/media/src/test-utils/` — use `createMockPodcastRepo(overrides)` instead of manually stubbing every method with `Effect.die`
- **Web app tests** are included in the vitest projects config — `pnpm test` runs them
- **Don't add jest/ts-jest** — this project uses Vitest exclusively
- **Root `package.json` only has workspace-level deps** — feature-specific deps go in the consuming package
