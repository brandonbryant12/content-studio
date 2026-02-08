# Task 99: Final Verification

## Standards Checklist

Review ALL standards referenced across all prior tasks:
- [ ] `standards/patterns/repository.md`
- [ ] `standards/patterns/use-case.md`
- [ ] `standards/patterns/error-handling.md`
- [ ] `standards/patterns/router-handler.md`
- [ ] `standards/patterns/serialization.md`
- [ ] `standards/frontend/components.md`
- [ ] `standards/frontend/data-fetching.md`
- [ ] `standards/frontend/mutations.md`
- [ ] `standards/frontend/forms.md`
- [ ] `standards/frontend/styling.md`
- [ ] `standards/frontend/testing.md`
- [ ] `standards/testing/use-case-tests.md`
- [ ] `standards/testing/integration-tests.md`

## Verification Scope

Launch up to 5 subagents to verify:

1. **Effect patterns** — Schema.TaggedError with HTTP protocol, Context.Tag + Layer, Effect.gen, Effect.withSpan, no console.log
2. **Repository patterns** — withDb helper, branded ID casts, Drizzle queries (no raw SQL), NotFound error handling
3. **API patterns** — handleEffectWithProtocol, Effect-based serializers, protectedProcedure, oRPC contract structure
4. **Frontend patterns** — Container/Presenter split, route loaders, useXxxActions hooks, no god components (>300 lines), ConfirmationDialog for deletes
5. **Accessibility + DX** — aria-labels on interactive elements, keyboard nav, document.title, skip-to-content, no `as any`, no `as unknown as`

## Verification Checklist

### Backend
- [ ] All domain errors use `Schema.TaggedError` with `httpStatus`, `httpCode`, `httpMessage`, `logLevel`
- [ ] All repos use `withDb` helper with span naming `{repoName}.{methodName}`
- [ ] All use cases use `getCurrentUser` from FiberRef
- [ ] All mutation use cases check ownership before performing action
- [ ] All use cases have `Effect.withSpan('useCase.xxx')` with relevant attributes
- [ ] No `console.log` in production code — use `Effect.log` instead
- [ ] No `as any` or `as unknown as` type casts
- [ ] Effect-based serializers used in handlers (not sync)
- [ ] Worker has resource cleanup (storage delete on DB failure)

### Frontend
- [ ] Every route has a `loader` with `queryClient.ensureQueryData`
- [ ] Every page sets `document.title`
- [ ] Every icon-only button has `aria-label`
- [ ] Every input has a label (htmlFor, aria-label, or aria-labelledby)
- [ ] Every delete action uses `ConfirmationDialog`
- [ ] No component exceeds 300 lines
- [ ] Mutations extracted into `useInfographicActions` hook
- [ ] Container/presenter separation maintained
- [ ] Radix UI primitives used for dropdowns, selects, dialogs

### Tests
- [ ] Mock factories used (no `as any` stubs)
- [ ] `withTestUser` used for user context
- [ ] All use cases have tests
- [ ] Prompt builder has tests
- [ ] Frontend has component tests

## Subagent Results

<!-- Agent writes results from each subagent -->

## Final Status

- [ ] All subagents passed
- [ ] No tasks reopened
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes
