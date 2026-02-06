# Content Studio - Claude Code Instructions

## Before Making Changes

**Always search `standards/` before implementing.** Use `Glob` with `standards/**/*.md` to find relevant standards.

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

### Accessibility (WCAG 2.1 Level A)
- **Every icon-only button MUST have `aria-label`** describing the action (e.g., `aria-label={`Delete ${item.title}`}`).
- **Every `<input>` MUST have a label** — either `<label htmlFor>`, `aria-label`, or `aria-labelledby`. Placeholders are NOT labels.
- **Form errors MUST be linked** to their inputs via `aria-describedby`. Error containers need `aria-live="polite"`. Inputs need `aria-invalid` when errored.
- **Interactive elements MUST be keyboard accessible.** Custom sliders need `onKeyDown` (Arrow keys). Upload zones need `role="button"`, `tabIndex={0}`, and `onKeyDown` (Enter/Space). Buttons need `type="button"` to prevent form submission.
- **Custom tabs MUST use ARIA tab pattern:** `role="tablist"` on container, `role="tab"` + `aria-selected` on triggers, `role="tabpanel"` + `aria-labelledby` on panels.
- **Collapsible sections MUST have `aria-expanded`** on their toggle button.
- **Every page MUST set `document.title`** (e.g., `"Documents - Content Studio"`).
- **Layout MUST include a skip-to-content link** for keyboard navigation.

### Destructive Actions
- **Every delete action MUST show a confirmation dialog.** Use the existing `ConfirmationDialog` component. Never execute destructive actions on a single click.
- **If a delete button has no handler, hide it.** Don't render non-functional interactive elements.

### Component Architecture
- **No god components (>300 lines).** Split into focused sub-components with single responsibilities.
- **No prop drilling beyond 2 levels.** Use context providers (e.g., `WorkbenchProvider`, `CollaboratorProvider`) for deeply-shared state.
- **No duplicating components between features.** If voiceover and podcast need the same component, extract to `shared/components/` parameterized by entity type.
- **Container/presenter separation.** Containers handle data/mutations; presenters receive props. Don't mix `useMutation`/`useQueryClient` into presenters.
- **Extract mutation logic into `useXxxActions` hooks** (e.g., `usePodcastActions`, `useVoiceoverActions`). Don't define mutations inline in containers.
- **Use Radix UI primitives** for dropdowns, selects, tabs, dialogs. Don't build custom versions with manual click-outside handlers.
- **Use React 19 `use()` instead of `useContext()`.**

### File Conventions
- **kebab-case for all files** (`podcast-detail-container.tsx`, not `podcastDetailContainer.tsx`)
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
