# Observability

## Golden Principles

1. Every use case has a `withSpan` call.
<!-- enforced-by: invariant-test -->

2. Every handler call to `handleEffectWithProtocol` includes a span name.
<!-- enforced-by: types -->

3. No `console.log` in `packages/` directories.
<!-- enforced-by: eslint -->

## Span Naming Convention
<!-- enforced-by: manual-review -->

| Layer | Pattern | Example |
|---|---|---|
| Handler | `api.{domain}.{action}` | `api.documents.get` |
| Use case | `useCase.{name}` | `useCase.getDocument` |
| Repository | `{repoName}.{method}` | `documentRepo.findById` |
| Serializer | `serialize.{entity}` | `serialize.document` |
| Worker | `worker.{domain}.{action}` | `worker.podcast.generateAudio` |

Use camelCase for multi-word names within a segment: `useCase.startPodcastGeneration`.

## Required Span Attributes
<!-- enforced-by: manual-review -->

| Attribute | Required In | Value |
|---|---|---|
| `user.id` | Use case spans | Current user ID from FiberRef |
| `resource.id` | Use case + repo spans | Primary resource ID being operated on |
| `request.id` | Handler spans | Request correlation ID |
| `job.id` | Worker spans | Job ID being processed |
| `error._tag` | Error spans | Typed error tag on failure |

## Handler Span Integration
<!-- enforced-by: types -->

`handleEffectWithProtocol` requires a `span` parameter. This is enforced by the TypeScript type signature of `HandleEffectOptions`.

```typescript
// In handler:
return handleEffectWithProtocol({
  effect: getDocument({ id: input.id }),
  errors,
  span: 'api.documents.get',  // Required by types
  serialize: serializeDocument,
});
```

## Use Case Span Integration
<!-- enforced-by: invariant-test -->

Every use case wraps its implementation in `withSpan`:

```typescript
export const getDocument = (input: GetDocumentInput) =>
  Effect.gen(function* () {
    // ... use case logic
  }).pipe(
    withSpan('useCase.getDocument')
  );
```

The invariant test at `packages/media/src/shared/__tests__/safety-invariants.test.ts` can be extended to verify all use case files include `withSpan`.

## Logging Policy
<!-- enforced-by: eslint -->

| Context | Allowed | Mechanism |
|---|---|---|
| `packages/` | Structured Effect logging only | `Effect.log`, `Effect.logWarning`, `Effect.logError` |
| `apps/server/` | Structured logging | Hono logger middleware + Effect logging |
| `apps/web/` | `console.*` permitted in dev | No restriction |
| Test files | `console.*` permitted | No restriction |

## Error Observability
<!-- enforced-by: architecture -->

Typed errors carry their `_tag` into spans automatically via `handleEffectWithProtocol`. The error mapper logs:

| Error Type | Log Level | Span Status |
|---|---|---|
| Expected domain error (4xx) | `info` | Error with `_tag` attribute |
| Unexpected/defect (5xx) | `error` | Error with stack trace |
| External service failure | `warning` | Error with upstream details |

## Key Files

| File | Purpose |
|---|---|
| `packages/api/src/server/effect-handler.ts` | `handleEffectWithProtocol` -- span creation + error mapping |
| `packages/media/src/shared/safety-primitives.ts` | `withSpan` re-export and safety wrappers |
| `packages/media/src/shared/__tests__/safety-invariants.test.ts` | Invariant enforcement |
