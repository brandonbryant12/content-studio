---
paths:
  - "packages/**/*.ts"
  - "apps/server/**/*.ts"
---

# Backend Rules

## Handlers Must Be Thin Orchestrators
- **Handlers call exactly ONE use case, then serialize.** No domain logic, no data transformation, no direct service/repo/storage access in handlers.
- **No domain functions defined in handler files.** If you need a helper that accesses Storage, repos, or does business logic, it belongs in a use case file in the appropriate domain package (`packages/media/src/{domain}/use-cases/` or `packages/ai/src/{domain}/use-cases/`).
- **No data transformation in handlers.** Operations like `Buffer.from(input.data, 'base64')`, base64 encoding, array mapping/enrichment, etc. belong in the use case. The handler passes `input` straight through.
- **No type casts to fix handler-use-case misalignment.** If types don't match between what a use case returns and what a serializer expects, fix the types at the source (e.g., widen the serializer input type) — don't cast with `as unknown as X`.
- **Readonly-to-mutable conversions** (`[...input.segments]`) are acceptable in handlers when oRPC contracts produce readonly types that use cases expect as mutable.

## Authorization
- **Every mutation use case MUST check ownership/authorization.** Use `requireOwnership(entity.createdBy)` or equivalent before performing mutations.
- **Always use `getCurrentUser` from FiberRef** for user context. Never accept `userId` as a use case input parameter — the handler sets up user context automatically via `withCurrentUser`. This applies to ALL use cases including list/query operations.

## Effect TS Patterns
- **Use `Effect.all` with `{ concurrency: 'unbounded' }` (or a reasonable limit)** for independent operations. Default `Effect.all` runs sequentially.
- **Use `Effect.acquireRelease` or `Effect.catchAll` cleanup** when performing multi-step operations (e.g., upload to storage then insert to DB). Clean up earlier steps on failure.
- **Never use `as unknown as` type casts.** Fix types properly. If oRPC types don't align, fix the adapter — don't cast in 36 places.
- **Never use `as any` in tests.** Create typed test utility factories (e.g., `createMockPodcastRepo(overrides)` in `packages/media/src/test-utils/`).

## Error Handling
- **Every domain error MUST use `Schema.TaggedError`** with HTTP protocol properties (`httpStatus`, `httpCode`, `httpMessage`, `logLevel`). Plain classes with `_tag` will fall through to generic 500s.

## Serialization
- **Always use Effect-based serializers** (`Effect.flatMap(serializeXEffect)`) in handlers. Never use sync serializers (`Effect.map(serializeX)`) — they lose tracing spans.
- **`JobSerializable` interface** in `packages/db/src/schemas/jobs.ts` accepts both DB `Job` and queue `Job` types. Use `serializeJobEffect` in handlers — never cast job types.

## Repository
- **Don't duplicate methods that return the same data.** If `findById` and `findByIdFull` have identical implementations, consolidate to one.
- **No duplicate repository files.** One repo per entity, in the `repos/` directory, using `Context.Tag`/Layer pattern.

## Logging
- Use `Effect.log` for production logging. Never leave `console.log` in production code paths.
