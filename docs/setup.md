# Development Setup

## Prerequisites
<!-- enforced-by: manual-review -->

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 22.10.0 | Runtime requirement |
| pnpm | 10.23.0 | Via corepack |
| Docker | Latest | PostgreSQL + Redis containers |

## Initial Setup

```bash
corepack enable                 # 1. Enable pnpm via corepack
pnpm install                    # 2. Install all dependencies
pnpm env:copy-example           # 3. Copy .env.example files
docker compose up -d            # 4. Start Postgres + Redis
pnpm db:push                    # 5. Push database schema
```

## Common Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start all dev servers (Turborepo watch) |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests (includes web app) |
| `pnpm test:invariants` | Safety invariant tests |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm db:push` | Push Drizzle schema to dev database |
| `pnpm db:studio` | Open Drizzle Studio GUI |
| `pnpm test:e2e` | Run Playwright E2E tests |

## Test Database
<!-- enforced-by: manual-review -->

Integration tests require a separate PostgreSQL instance.

```bash
pnpm test:db:up                 # Start test DB container
pnpm test:db:setup              # Push schema to test DB
pnpm --filter @repo/api test    # Run integration tests
pnpm test:db:down               # Stop test DB container
```

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| Database | `content_studio_test` |
| User / Password | `test` / `test` |
| Connection URL | `postgresql://test:test@localhost:5433/content_studio_test` |
| Storage | `tmpfs` (ephemeral -- data lost on container stop) |

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `SERVER_POSTGRES_URL` | PostgreSQL connection string used by `apps/server` and `apps/worker` |
| `DB_POSTGRES_URL` | PostgreSQL connection string used by Drizzle CLI (`pnpm db:push`, `pnpm db:migrate`) |
| `PUBLIC_SERVER_URL` | Public API URL used for server responses and web client configuration |
| `PUBLIC_WEB_URL` | Public web app URL used by server CORS/auth redirects |
| `SERVER_AUTH_SECRET` | Auth secret for `better-auth` session signing |
| `GEMINI_API_KEY` | Google Gemini API key when `USE_MOCK_AI=false` |

### Optional

| Variable | Description | Default |
|---|---|---|
| `AUTH_MODE` | Auth behavior (`dev-password`, `hybrid`, `sso-only`) | `dev-password` |
| `PUBLIC_AUTH_MODE` | Web login UI mode; keep aligned with server `AUTH_MODE` | `dev-password` |
| `USE_MOCK_AI` | Use mock AI providers instead of live Gemini providers | `true` |
| `STORAGE_PROVIDER` | Storage backend (`filesystem` / `s3`) | `filesystem` |
| `SERVER_REDIS_URL` | Redis for SSE pub/sub | `redis://localhost:6379` |
| `S3_BUCKET` | S3 bucket name | -- |
| `S3_REGION` | S3 region | -- |
| `TELEMETRY_ENABLED` | Enable backend OpenTelemetry export | `true` in production, else `false` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | OTLP traces endpoint (Datadog Agent/Collector) | `http://localhost:4318/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Optional OTLP headers (`KEY=value,KEY2=value2`) | -- |
| `OTEL_SERVICE_NAME` | Override backend service name (`server` / `worker`) | app default |
| `OTEL_SERVICE_VERSION` | Override service version | `0.0.0` |
| `OTEL_ENV` | Deployment environment tag | `NODE_ENV` |

Telemetry settings apply to backend services (`apps/server`, `apps/worker`) only.

### SSO Variables (Required When `AUTH_MODE=hybrid` Or `AUTH_MODE=sso-only`)

| Variable | Description |
|---|---|
| `AUTH_MICROSOFT_CLIENT_ID` | Microsoft Entra app client ID |
| `AUTH_MICROSOFT_CLIENT_SECRET` | Microsoft Entra app client secret |
| `AUTH_MICROSOFT_TENANT_ID` | Microsoft Entra tenant ID |
| `AUTH_ROLE_ADMIN_GROUP_IDS` | Comma-separated Graph group IDs that map to role `admin` |
| `AUTH_ROLE_USER_GROUP_IDS` | Comma-separated Graph group IDs that map to role `user` |

### Datadog Configuration (Backend)

Set the following in both `apps/server/.env` and `apps/worker/.env`.

Use a local Datadog Agent or OTLP Collector:

```bash
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=content-studio-server
OTEL_ENV=production
```

Use direct Datadog OTLP intake:

```bash
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<your-datadog-otlp-traces-endpoint>
OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=<your-datadog-api-key>
OTEL_SERVICE_NAME=content-studio-server
OTEL_ENV=production
```

Set `OTEL_SERVICE_NAME=content-studio-worker` in worker env files.

## Troubleshooting

| Problem | Fix |
|---|---|
| Test DB connection refused | `pnpm test:db:down && pnpm test:db:up && pnpm test:db:setup` |
| Port 5433 in use | `lsof -i :5433` to find conflicting process |
| Schema out of sync (dev) | `pnpm db:push` |
| Schema out of sync (test) | `DB_POSTGRES_URL=postgresql://test:test@localhost:5433/content_studio_test pnpm db:push` |
| pnpm version mismatch | `corepack enable && pnpm install` |
| Stale `@repo/db` dist | `pnpm --filter @repo/db build` before downstream `typecheck` |
| Stale `@repo/testing` dist | `rm -rf packages/testing/dist && pnpm --filter @repo/testing build` |
