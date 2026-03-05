# Observability

## Golden Principles

1. Every use case must use `withUseCaseSpan(...)` and `annotateUseCaseSpan(...)`. <!-- enforced-by: invariant-test -->
2. Every handler call gets an automatic span via `@orpc/otel`. <!-- enforced-by: runtime -->
3. Avoid `console.log` in `packages/` directories unless an explicit lint exemption is justified. <!-- enforced-by: eslint -->

## Span Naming Convention
<!-- enforced-by: manual-review -->

| Layer | Pattern | Example |
|---|---|---|
| Handler | `api.{domain}.{action}` | `api.sources.get` |
| Use case | `useCase.{name}` | `useCase.getSource` |
| Repository | `{repoName}.{method}` | `sourceRepo.findByIdForUser` |
| Serializer | `serialize.{entity}` | `serialize.source` |
| Worker | `worker.{domain}.{action}` | `worker.podcast.generateAudio` |

Use camelCase for multi-word names inside a segment: `useCase.startPodcastGeneration`.

## Required Span Attributes
<!-- enforced-by: invariant-test -->

| Attribute | Required in | Value |
|---|---|---|
| `user.id` | Use case spans | Current user ID from FiberRef |
| `resource.id` | Use case and repo spans | Primary resource ID being operated on |
| `request.id` | Handler spans | Request correlation ID |
| `job.id` | Worker spans | Job ID being processed |
| `error._tag` | Error spans | Typed error tag on failure |

## Automatic Procedure Instrumentation
<!-- enforced-by: runtime -->

All oRPC procedure calls, middleware, and handler phases are instrumented via `@orpc/otel`. `ORPCSpanRenamer` converts the default procedure span names to the `api.{domain}.{action}` convention.

| oRPC default | Renamed |
|---|---|
| `call_procedure` with `procedure.path` | `api.sources.get` |
| `middleware.auth` | `middleware.auth` |
| `handler` | `handler` |
| `validate_input` / `validate_output` | unchanged |

### Trace Structure

A typical authenticated request looks like this:

```
api.sources.get
  └── middleware.auth
       └── handler
            └── useCase.getSource
                 └── sourceRepo.findByIdForUser
```

Handlers rely on the automatic oRPC span for the outer request. Use case, repo, and serializer spans remain explicit.

## Handler Span Integration
<!-- enforced-by: @orpc/otel auto-instrumentation -->

`handleEffectWithProtocol` does not need a manual outer span in standard handlers. Pass request metadata and attributes instead:

```typescript
return handleEffectWithProtocol(
  context.runtime,
  context.user,
  getSource({ id: input.id }).pipe(Effect.flatMap(serializeSourceEffect)),
  errors,
  {
    requestId: context.requestId,
    attributes: { 'source.id': input.id },
  },
);
```

## Use Case Span Integration
<!-- enforced-by: invariant-test -->

Use cases should wrap the effect and attach attributes explicitly:

```typescript
export const getSource = (input: GetSourceInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'source.id': input.id },
    });

    // use case logic...
  }).pipe(withUseCaseSpan('useCase.getSource'));
```

The invariant tests in `packages/media/src/shared/__tests__/safety-invariants.test.ts` enforce this pattern.

## Logging Policy
<!-- enforced-by: eslint -->

| Context | Allowed | Mechanism |
|---|---|---|
| `packages/` | Structured Effect logging only; `console.log` needs an explicit exemption | `Effect.log*` |
| `apps/server/` | Structured lifecycle and request logging | Hono logger middleware plus Effect logging |
| `apps/web/` | `console.*` allowed in development | Browser console |
| Tests | `console.*` allowed when useful | Test runner output |

## Telemetry Export
<!-- enforced-by: manual-review -->

Trace export is configured for backend processes only:

- `apps/server`
- `apps/worker`

The web frontend does not send client-side telemetry by default.

### Runtime Wiring Pattern

1. Parse telemetry env vars in each backend app's `env.ts`.
2. Pass `telemetryConfig` to `createServerRuntime(...)`.
3. Let `TelemetryLive` own tracer provider setup and shutdown.
4. Call `runtime.dispose()` during graceful shutdown to flush and close telemetry cleanly.

### OTLP Environment Contract

| Variable | Purpose | Notes |
|---|---|---|
| `TELEMETRY_ENABLED` | Enable export | Defaults to `true` in production, else `false` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Trace exporter endpoint | Used as-is |
| `OTEL_EXPORTER_OTLP_HEADERS` | Optional OTLP headers | `KEY=value,KEY2=value2` |
| `OTEL_SERVICE_NAME` | Service identifier | Distinct values for server and worker |
| `OTEL_SERVICE_VERSION` | Service version tag | Optional override |
| `OTEL_ENV` | Deployment environment tag | Defaults to `NODE_ENV` |

### Server-Timing Header

`apps/server` enables Hono `timing()` middleware, so non-streaming responses include a `Server-Timing` header for browser inspection.

## Error Observability
<!-- enforced-by: architecture -->

Typed errors carry `_tag` into spans through `handleEffectWithProtocol`.

| Error type | Log level | Span status |
|---|---|---|
| Expected domain error (4xx) | `info` | Error with `_tag` attribute |
| Unexpected defect (5xx) | `error` | Error with stack trace |
| External service failure | `warning` | Error with upstream details |

## Key Files

| File | Purpose |
|---|---|
| `packages/api/src/server/effect-handler.ts` | `handleEffectWithProtocol` error mapping and span metadata |
| `packages/media/src/shared/safety-primitives.ts` | `withUseCaseSpan` and `annotateUseCaseSpan` |
| `packages/media/src/shared/__tests__/safety-invariants.test.ts` | Invariant enforcement |
| `packages/db/src/telemetry.ts` | `TelemetryLive`, `ORPCSpanRenamer`, OTLP exporter wiring |
| `packages/api/src/server/runtime.ts` | Shared layer composition |
| `apps/server/src/server.ts` | Runtime startup and shutdown |
| `apps/worker/src/worker.ts` | Worker startup and shutdown |
