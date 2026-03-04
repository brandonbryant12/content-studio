# Content Studio

Content Studio is a product playground for multimodal generative AI.
It is built to help teams experiment with different AI modalities, compare outputs, and quickly iterate on new experiences.

## Product Vision

Enable one workspace where creators can:

1. Bring in source material.
2. Apply style and voice through personas.
3. Generate outputs across multiple AI modalities.
4. Test, compare, and refine results fast.

## Current Modalities

1. Documents: ingest and structure source context.
2. Podcasts: generate long-form audio content.
3. Voiceovers: generate focused narration.
4. Infographics: generate visual summaries.

## Why This Exists

Most AI products support one modality at a time.
Content Studio is designed as a practical sandbox to explore what works across modalities and to make it easy to add new ones.

## How It Works

1. Web app for content creation and iteration.
2. API and domain services for orchestration.
3. Background workers for async generation jobs.
4. Pluggable AI providers for LLM/TTS workflows.

## Engineering Source of Truth

`docs/` is the source of truth for architecture, tech stack decisions, and coding patterns.

Start here:

1. Engineering docs index: [`docs/README.md`](./docs/README.md)
2. Architecture overview: [`docs/architecture/overview.md`](./docs/architecture/overview.md)
3. Backend patterns: [`docs/patterns/`](./docs/patterns/)
4. Frontend standards: [`docs/frontend/`](./docs/frontend/)

## Software Factory

Operation, strategy, automation, and workflow-memory conventions are defined in [`software-factory/`](./software-factory/).

Start here:

1. Operations catalog: [`software-factory/operations/README.md`](./software-factory/operations/README.md)
2. Strategy catalog: [`software-factory/workflows/README.md`](./software-factory/workflows/README.md)
3. Automations guide: [`automations/README.md`](./automations/README.md)
4. Workflow memory guide: [`software-factory/workflow-memory/README.md`](./software-factory/workflow-memory/README.md)

## Development Setup

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 22.10.0 | Runtime requirement |
| pnpm | 10.23.0 | Via corepack |
| Docker | Latest | PostgreSQL + Redis containers |

### Initial Setup

```bash
corepack enable                 # 1. Enable pnpm via corepack
pnpm install                    # 2. Install all dependencies
pnpm env:copy-example           # 3. Copy .env.example files
docker compose up -d            # 4. Start Postgres + Redis
pnpm db:push                    # 5. Push database schema
```

### Common Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start all dev servers (Turborepo watch) |
| `pnpm deploy:linux` | Interactive Docker Compose deploy (`.env.deploy`) |
| `pnpm redeploy:linux` | `git pull --ff-only` + re-deploy using existing `.env.deploy` |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests (includes web app) |
| `pnpm test:invariants` | Safety invariant tests |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm db:push` | Push Drizzle schema to dev database |
| `pnpm db:studio` | Open Drizzle Studio GUI |
| `pnpm test:e2e` | Run Playwright E2E tests |

### Environment Variables

#### Required

| Variable | Description |
|---|---|
| `SERVER_POSTGRES_URL` | PostgreSQL connection string used by `apps/server` and `apps/worker` |
| `DB_POSTGRES_URL` | PostgreSQL connection string used by Drizzle CLI (`pnpm db:push`, `pnpm db:migrate`) |
| `PUBLIC_SERVER_URL` | Public API URL used for server responses and web client configuration |
| `PUBLIC_WEB_URL` | Public web app URL used by server CORS/auth redirects |
| `SERVER_AUTH_SECRET` | Auth secret for `better-auth` session signing |
| `GEMINI_API_KEY` | Google Gemini API key when `USE_MOCK_AI=false` |

#### Optional

| Variable | Description | Default |
|---|---|---|
| `AUTH_MODE` | Auth behavior (`dev-password`, `hybrid`, `sso-only`) | `dev-password` |
| `PUBLIC_AUTH_MODE` | Web login UI mode; keep aligned with server `AUTH_MODE` | `dev-password` |
| `USE_MOCK_AI` | Use mock AI providers instead of live Gemini providers | `true` |
| `STORAGE_PROVIDER` | Storage backend (`filesystem` / `s3`) | `filesystem` |
| `SERVER_REDIS_URL` | Redis for SSE pub/sub | `redis://localhost:6379` |
| `TRUST_PROXY` | Trust `x-forwarded-for` / `x-real-ip` for rate-limit identity | `false` |
| `CORS_ORIGINS` | Comma-separated credentialed CORS origin allowlist (`*` only for local-dev) | `PUBLIC_WEB_URL` |
| `AUTH_COOKIE_SAME_SITE` | Auth cookie SameSite (`lax` / `strict` / `none`) | better-auth default (`lax`) |
| `AUTH_COOKIE_SECURE` | Force secure auth cookies (`true` / `false`) | auto (true on https) |
| `S3_BUCKET` | S3 bucket name | -- |
| `S3_REGION` | S3 region | -- |
| `TELEMETRY_ENABLED` | Enable backend OpenTelemetry export | `true` in production, else `false` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | OTLP traces endpoint (used as-is) | -- |
| `OTEL_EXPORTER_OTLP_HEADERS` | Optional OTLP headers (`KEY=value,KEY2=value2`) | -- |
| `OTEL_SERVICE_NAME` | Override backend service name (`server` / `worker`) | app default |
| `OTEL_SERVICE_VERSION` | Override service version | `0.0.0` |
| `OTEL_ENV` | Deployment environment tag | `NODE_ENV` |

Telemetry settings apply to backend services (`apps/server`, `apps/worker`) only.

#### SSO Variables (Required when `AUTH_MODE=hybrid` or `AUTH_MODE=sso-only`)

| Variable | Description |
|---|---|
| `AUTH_MICROSOFT_CLIENT_ID` | Microsoft Entra app client ID |
| `AUTH_MICROSOFT_CLIENT_SECRET` | Microsoft Entra app client secret |
| `AUTH_MICROSOFT_TENANT_ID` | Microsoft Entra tenant ID |
| `AUTH_ROLE_ADMIN_GROUP_IDS` | Comma-separated Graph group IDs that map to role `admin` |
| `AUTH_ROLE_USER_GROUP_IDS` | Comma-separated Graph group IDs that map to role `user` |

#### Datadog Configuration (Backend)

Set these in both `apps/server/.env` and `apps/worker/.env`.

Using a local Datadog Agent or OTLP Collector:

```bash
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=content-studio-server
OTEL_ENV=production
```

Using direct Datadog OTLP intake:

```bash
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<your-datadog-otlp-traces-endpoint>
OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=<your-datadog-api-key>
OTEL_SERVICE_NAME=content-studio-server
OTEL_ENV=production
```

Set `OTEL_SERVICE_NAME=content-studio-worker` in worker env files.

### Troubleshooting

| Problem | Fix |
|---|---|
| Schema out of sync (dev) | `pnpm db:push` |
| pnpm version mismatch | `corepack enable && pnpm install` |
| Stale `@repo/db` dist | `pnpm --filter @repo/db build` before downstream `typecheck` |
| Stale `@repo/testing` dist | `rm -rf packages/testing/dist && pnpm --filter @repo/testing build` |

## Key References

1. Behavior specification: [`docs/master-spec.md`](./docs/master-spec.md)
2. Engineering docs index: [`docs/README.md`](./docs/README.md)
3. Architecture overview: [`docs/architecture/overview.md`](./docs/architecture/overview.md)
4. Operations catalog: [`software-factory/operations/README.md`](./software-factory/operations/README.md)
