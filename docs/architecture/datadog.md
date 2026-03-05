# Datadog Integration

Content Studio exports traces to Datadog via the OpenTelemetry Protocol (OTLP). There is no Datadog SDK or `dd-trace` dependency — all instrumentation uses the standard OpenTelemetry libraries already configured in [`packages/db/src/telemetry.ts`](../../packages/db/src/telemetry.ts).

## How It Works

```
┌──────────────┐   OTLP/HTTP    ┌──────────────────┐          ┌─────────┐
│ server / worker │ ──────────► │ Datadog Agent     │ ───────► │ Datadog │
│ (BatchSpanProc) │  :4318      │ (OTLP ingest)     │          │  Cloud  │
└──────────────┘               └──────────────────┘          └─────────┘
```

1. Each backend app (`apps/server`, `apps/worker`) parses telemetry env vars in `env.ts`.
2. The app passes `telemetryConfig` to `createServerRuntime(...)`.
3. The `TelemetryLive` Effect layer creates and registers `NodeTracerProvider` + `BatchSpanProcessor` + `OTLPTraceExporter`.
4. The exporter sends trace data to the configured endpoint — typically a Datadog Agent running OTLP ingest.
5. During graceful shutdown, each app calls `runtime.dispose()`, which runs layer finalizers and flushes/shuts down telemetry.

Canonical lifecycle contract: [`docs/architecture/observability.md` — Runtime Wiring Pattern](./observability.md#runtime-wiring-pattern).
No imperative `initTelemetry()` / `shutdownTelemetry()` calls are used in the current runtime.

## Deployment Options

### Option A: Datadog Agent (recommended)

Run the Datadog Agent alongside your application. The Agent receives OTLP data locally and forwards it to Datadog, handling retries, buffering, and host metadata enrichment.

#### Docker Compose

Add to `compose.yaml`:

```yaml
datadog-agent:
  image: gcr.io/datadoghq/agent:7
  environment:
    DD_API_KEY: "${DD_API_KEY}"
    DD_SITE: "${DD_SITE:-datadoghq.com}"
    DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT: "0.0.0.0:4318"
    DD_APM_NON_LOCAL_TRAFFIC: "true"
  ports:
    - "4318:4318"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - /proc/:/host/proc/:ro
    - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
```

Then set the telemetry env vars on `server` and `worker`:

```yaml
server:
  environment:
    TELEMETRY_ENABLED: "true"
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://datadog-agent:4318/v1/traces"
    OTEL_SERVICE_NAME: content-studio-server
    OTEL_ENV: production
  depends_on:
    - datadog-agent

worker:
  environment:
    TELEMETRY_ENABLED: "true"
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://datadog-agent:4318/v1/traces"
    OTEL_SERVICE_NAME: content-studio-worker
    OTEL_ENV: production
  depends_on:
    - datadog-agent
```

#### Kubernetes / ECS

When running the Datadog Agent as a DaemonSet or sidecar, point the endpoint to `localhost`:

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

### Option B: Agentless (direct to Datadog intake)

Send traces directly to Datadog's OTLP intake without running an Agent. This is simpler to set up but loses Agent-side features like host metadata enrichment and local buffering.

```bash
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://http-intake.logs.datadoghq.com/api/v2/otlp/v1/traces
OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=your-datadog-api-key
OTEL_SERVICE_NAME=content-studio-server
OTEL_ENV=production
```

Replace `datadoghq.com` in the URL with your Datadog site (`datadoghq.eu`, `us3.datadoghq.com`, etc.) as appropriate.

## Environment Variables

All telemetry config is read from environment variables. No code changes are required.

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEMETRY_ENABLED` | No | `true` in production, `false` otherwise | Master toggle for trace export |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Yes (when enabled) | — | Full URL including path, e.g. `http://localhost:4318/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Agent: No. Agentless: Yes | — | Comma-separated `KEY=value` pairs (e.g. `DD-API-KEY=abc123`) |
| `OTEL_SERVICE_NAME` | No | `content-studio-server` / `content-studio-worker` | Maps to Datadog's `service` tag |
| `OTEL_SERVICE_VERSION` | No | `0.0.0` | Maps to Datadog's `version` tag |
| `OTEL_ENV` | No | `NODE_ENV` | Maps to Datadog's `env` tag |

Malformed `OTEL_EXPORTER_OTLP_HEADERS` entries (missing `=`, empty key/value) cause a `MalformedOtlpHeadersError` at startup rather than being silently dropped.

## Local Development

To see traces locally, run the Datadog Agent with OTLP ingest enabled:

```bash
docker run -d --name dd-agent \
  -e DD_API_KEY="$DD_API_KEY" \
  -e DD_SITE="datadoghq.com" \
  -e DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT="0.0.0.0:4318" \
  -e DD_APM_NON_LOCAL_TRAFFIC=true \
  -p 4318:4318 \
  gcr.io/datadoghq/agent:7
```

Then in your `.env` files:

```bash
# apps/server/.env
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=content-studio-server
OTEL_ENV=development

# apps/worker/.env
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=content-studio-worker
OTEL_ENV=development
```

## Verifying Traces in Datadog

1. **APM > Traces** — filter by `service:content-studio-server` or `service:content-studio-worker`.
2. **Service Map** — should show `content-studio-server` and `content-studio-worker` as distinct services.
3. Trace details show the span hierarchy documented in [`observability.md`](./observability.md):

```
api.sources.get            ← oRPC auto-span (renamed by ORPCSpanRenamer)
  └── middleware.auth      ← oRPC auto-span
       └── handler         ← oRPC auto-span
            └── useCase.getSource     ← withUseCaseSpan
                 └── sourceRepo.findByIdForUser
```

## Unified Service Tagging

Datadog uses three tags to correlate traces, logs, and infrastructure: `service`, `env`, and `version`. These map directly from our OTEL resource attributes:

| OTEL Resource Attribute | Datadog Tag | Set By |
|---|---|---|
| `service.name` | `service` | `OTEL_SERVICE_NAME` |
| `deployment.environment.name` | `env` | `OTEL_ENV` |
| `service.version` | `version` | `OTEL_SERVICE_VERSION` |

## Troubleshooting

| Symptom | Check |
|---|---|
| No traces appearing | Verify `TELEMETRY_ENABLED=true` and `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is set. Check startup logs for the "skipping trace export" warning. |
| Startup crash with `MalformedOtlpHeadersError` | Fix the `OTEL_EXPORTER_OTLP_HEADERS` format — must be `KEY=value,KEY2=value2`. |
| Traces arrive but show `unknown_service` | Set `OTEL_SERVICE_NAME` explicitly on each process. |
| Traces arrive but `env` is empty | Set `OTEL_ENV` or ensure `NODE_ENV` is set. |
| Agent is running but no traces arrive | Confirm `DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT` is set on the Agent and the port is reachable from the app container. |
| Agentless: 403 from Datadog intake | Verify `DD-API-KEY` in `OTEL_EXPORTER_OTLP_HEADERS` is correct and active. |
