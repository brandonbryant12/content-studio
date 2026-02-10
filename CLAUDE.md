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

---

## Backend Rules

### Authorization
- **Every mutation use case MUST check ownership/authorization.** Use `requireOwnership(entity.createdBy)` or equivalent before performing mutations. Reference: `get-document-content.ts` for the correct pattern.
- **Always use `getCurrentUser` from FiberRef** for user context. Never accept `userId` as a use case input parameter — the handler sets up user context automatically.

### Effect TS Patterns
- **Use `Effect.all` with `{ concurrency: 'unbounded' }` (or a reasonable limit)** for independent operations. Default `Effect.all` runs sequentially.
- **Use `Effect.acquireRelease` or `Effect.catchAll` cleanup** when performing multi-step operations (e.g., upload to storage then insert to DB). Clean up earlier steps on failure.
- **Never use `as unknown as` type casts.** Fix types properly. If oRPC types don't align, fix the adapter — don't cast in 36 places.
- **Never use `as any` in tests.** Create typed test utility factories (e.g., `createMockPodcastRepo(overrides)` in `packages/media/src/test-utils/`).

### Error Handling
- **Every domain error MUST use `Schema.TaggedError`** with HTTP protocol properties (`httpStatus`, `httpCode`, `httpMessage`, `logLevel`). Plain classes with `_tag` will fall through to generic 500s.

### Serialization
- **Always use Effect-based serializers** (`Effect.flatMap(serializeXEffect)`) in handlers. Never use sync serializers (`Effect.map(serializeX)`) — they lose tracing spans.

### Repository
- **Don't duplicate methods that return the same data.** If `findById` and `findByIdFull` have identical implementations, consolidate to one.
- **No duplicate repository files.** One repo per entity, in the `repos/` directory, using `Context.Tag`/Layer pattern.

### No console.log
- Use `Effect.log` for production logging. Never leave `console.log` in production code paths.

---

## Frontend Rules

### Performance
- **Every route MUST have a `loader`** that calls `queryClient.ensureQueryData(...)`. The router has `defaultPreload: 'intent'` configured — adding a loader enables instant navigation on hover/focus for free.
- **Lazy-load heavy third-party libraries** with `React.lazy()`. Syntax highlighters, DnD kits, rich editors, etc. should not be in the main bundle. Show a lightweight fallback while loading.
- **Use refs for high-frequency transient values** (e.g., audio `currentTime`). Only update state when the displayed value changes (e.g., once per second for time displays). Don't trigger 4 re-renders/second for a seconds counter.

### Accessibility
- **WCAG 2.1 Level A required.** See `standards/frontend/components.md` for full rules.
- Key: every icon button needs `aria-label`, every input needs a label, every page sets `document.title`.

### Destructive Actions
- **Every delete action MUST show a confirmation dialog.** Use the existing `ConfirmationDialog` component. Never execute destructive actions on a single click.
- **If a delete button has no handler, hide it.** Don't render non-functional interactive elements.

### Component Architecture
- **See `standards/frontend/components.md` and `standards/frontend/project-structure.md`** for full rules.
- Key: container/presenter split, max 300 lines, `useXxxActions` hooks for mutations, Radix UI primitives, `use()` not `useContext()`.

### File Conventions
- **kebab-case for all files** (`podcast-detail-container.tsx`, not `podcastDetailContainer.tsx`)
- Exception: client singletons (`authClient.ts`, `queryClient.ts`, `apiClient.ts`) and TanStack Router param files (`$podcastId.tsx`)
- Shared components: `shared/components/`
- Shared hooks: `shared/hooks/`
- Feature hooks: `features/xxx/hooks/`

---

## DX & Tooling

- **All dependencies use `catalog:`** in package.json for version alignment via pnpm catalog
- **Mock repo factories** are in `packages/media/src/test-utils/` — use `createMockPodcastRepo(overrides)` instead of manually stubbing every method with `Effect.die`
- **Web app tests** are included in the vitest workspace — `pnpm test` runs them
- **Don't add jest/ts-jest** — this project uses Vitest exclusively
- **Root `package.json` only has workspace-level deps** — feature-specific deps go in the consuming package
