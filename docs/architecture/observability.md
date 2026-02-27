# Observability

## Golden Principles

1. Every use case has a `withSpan` call.
<!-- enforced-by: invariant-test -->

2. Every handler call gets an automatic span via `@orpc/otel` (`ORPCSpanRenamer` maps `call_procedure` → `api.{domain}.{action}`).
<!-- enforced-by: runtime -->

3. Avoid `console.log` in `packages/` directories; exceptions require an explicit `eslint-disable no-console` comment (for test infra or bootstrap output).
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
<!-- enforced-by: invariant-test -->

| Attribute | Required In | Value |
|---|---|---|
| `user.id` | Use case spans | Current user ID from FiberRef |
| `resource.id` | Use case + repo spans | Primary resource ID being operated on |
| `request.id` | Handler spans | Request correlation ID |
| `job.id` | Worker spans | Job ID being processed |
| `error._tag` | Error spans | Typed error tag on failure |

## Automatic Procedure Instrumentation (@orpc/otel)
<!-- enforced-by: runtime -->

All oRPC procedure calls, middleware, and handler phases are automatically instrumented via `@orpc/otel`. A custom `ORPCSpanRenamer` processor transforms the default oRPC span names to match our convention:

| oRPC Default | Renamed |
|---|---|
| `call_procedure` (with `procedure.path` attribute) | `api.documents.get` |
| `middleware.auth` | `middleware.auth` (unchanged) |
| `handler` | `handler` (unchanged) |
| `validate_input` / `validate_output` | unchanged |

### Trace Structure

A typical authenticated request produces:

```
api.documents.get (auto — oRPC + ORPCSpanRenamer)
  └── middleware.auth (auto — oRPC, named function)
       └── handler (auto — oRPC)
            └── useCase.getDocument (Effect.withSpan — use case level)
                 └── documentRepo.findById (Effect.withSpan — repo level)
```

Manual `span` in `handleEffectWithProtocol` is optional. Handlers rely on @orpc/otel auto-spans; use-case and repo spans remain manual via `Effect.withSpan`.

## Handler Span Integration
<!-- enforced-by: @orpc/otel auto-instrumentation -->

`handleEffectWithProtocol` accepts an optional `span` parameter. When omitted, the handler relies on `@orpc/otel` auto-instrumentation for the outer span. Use-case spans (`Effect.withSpan`) remain required.

```typescript
// Handler — span auto-provided by @orpc/otel:
return handleEffectWithProtocol(
  context.runtime,
  context.user,
  getDocument({ id: input.id }),
  errors,
  { requestId: context.requestId },
);
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
| `packages/` | Structured Effect logging only; `console.log` requires explicit `eslint-disable no-console` in test infra | `Effect.log`, `Effect.logWarning`, `Effect.logError` |
| `apps/server/` | Structured logging | Hono logger middleware + Effect logging |
| `apps/web/` | `console.*` permitted in dev | No restriction |
| Test files | `console.*` permitted (prefer explicit disables when lint applies) | No restriction |

Notes:
- Test infrastructure in `packages/testing/` uses `console.log` with explicit `eslint-disable` comments to surface setup/teardown output.

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
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Trace exporter endpoint | Used as-is; path defaults to `/` when missing |
| `OTEL_EXPORTER_OTLP_HEADERS` | Optional OTLP headers | Comma-separated `KEY=value,KEY2=value2` |
| `OTEL_SERVICE_NAME` | Service identifier | Set distinct values for server and worker |
| `OTEL_SERVICE_VERSION` | Service version tag | Optional override |
| `OTEL_ENV` | Deployment environment tag | Defaults to `NODE_ENV` |

### Exporter Behavior

- If `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is present, use it as-is with OTLP HTTP export + `BatchSpanProcessor`.
- If no endpoint is configured, telemetry logs a warning and skips trace export entirely (no `ConsoleSpanExporter` fallback).
- `OTEL_EXPORTER_OTLP_HEADERS` applies to trace export headers. Malformed entries (missing `=`, empty key/value) cause a `MalformedOtlpHeadersError` at startup rather than being silently dropped.

### Server-Timing Header

The Hono server includes `timing()` middleware that adds a `Server-Timing` response header with `total;dur=<ms>` to every non-streaming response. This enables browser DevTools performance analysis without additional instrumentation. Streaming responses (SSE) are unaffected — headers are sent before the body starts.

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
| `packages/db/src/telemetry.ts` | OTLP exporter setup, `ORPCSpanRenamer`, `@orpc/otel` registration, provider lifecycle |
| `apps/server/src/server.ts` | Server telemetry bootstrap + graceful shutdown hook |
| `apps/worker/src/worker.ts` | Worker telemetry bootstrap + graceful shutdown hook |
