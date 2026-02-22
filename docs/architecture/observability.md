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

## Telemetry Export (Datadog OTLP)
<!-- enforced-by: manual-review -->

Trace export is configured for backend processes only:

- `apps/server`
- `apps/worker`

The web frontend currently does not send client-side error telemetry.

### Runtime Wiring Pattern

1. Parse telemetry env vars in each backend app's `env.ts`.
2. Call `initTelemetry(...)` at process startup before serving requests or jobs.
3. Call `shutdownTelemetry()` during graceful shutdown before process exit.

This ensures spans are exported reliably and flush on termination.

### OTLP Environment Contract

| Variable | Purpose | Notes |
|---|---|---|
| `TELEMETRY_ENABLED` | Enable export | Defaults to `true` in production, else `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base OTLP endpoint | Appends `/v1/traces` for traces |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Trace exporter endpoint | Used as-is; path defaults to `/` when missing |
| `OTEL_EXPORTER_OTLP_HEADERS` | Optional OTLP headers | Comma-separated `KEY=value,KEY2=value2` |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | Trace-specific OTLP headers | Overrides `OTEL_EXPORTER_OTLP_HEADERS` |
| `OTEL_SERVICE_NAME` | Service identifier | Set distinct values for server and worker |
| `OTEL_SERVICE_VERSION` | Service version tag | Optional override |
| `OTEL_ENV` | Deployment environment tag | Defaults to `NODE_ENV` |

### Exporter Behavior

- If `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is present, use it as-is with OTLP HTTP export + `BatchSpanProcessor`.
- Else if `OTEL_EXPORTER_OTLP_ENDPOINT` is present, append `/v1/traces` and use OTLP HTTP export + `BatchSpanProcessor`.
- If neither endpoint is configured, fall back to `ConsoleSpanExporter` for local debugging.
- `OTEL_EXPORTER_OTLP_TRACES_HEADERS` takes precedence over `OTEL_EXPORTER_OTLP_HEADERS`.

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
| `packages/db/src/telemetry.ts` | OTLP exporter setup + provider lifecycle (`initTelemetry` / `shutdownTelemetry`) |
| `apps/server/src/server.ts` | Server telemetry bootstrap + graceful shutdown hook |
| `apps/worker/src/worker.ts` | Worker telemetry bootstrap + graceful shutdown hook |
