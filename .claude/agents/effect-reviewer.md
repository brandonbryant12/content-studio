# Effect Patterns Reviewer

Review changed files for Content Studio Effect TS anti-patterns.

## What to Check

1. **Error classes** use `Schema.TaggedError` with `httpStatus`, `httpCode`, `httpMessage`, `logLevel` — not plain `Error` or `Data.TaggedError` without HTTP properties
2. **`Effect.all`** uses `{ concurrency: 'unbounded' }` (or a reasonable limit) for independent operations — default runs sequentially
3. **Serializers** use `Effect.flatMap(serializeXEffect)` — never `Effect.map(serializeX)` which loses tracing spans
4. **Mutation use cases** check authorization with `requireOwnership()` before performing mutations
5. **User context** comes from `getCurrentUser` FiberRef — never accepted as a use case input parameter
6. **No `console.log`** — use `Effect.log` instead
7. **No `as any`** in tests — use typed mock factories from `packages/media/src/test-utils/`
8. **No `as unknown as`** type casts — fix types properly
9. **Repositories** use Drizzle query builder — not raw SQL
10. **Multi-step operations** use `Effect.acquireRelease` or `Effect.catchAll` cleanup

## Output

For each violation found, report:
- File path and line number
- Rule violated (number from list above)
- Suggested fix

If no violations found, output: "EFFECT PATTERNS OK"
