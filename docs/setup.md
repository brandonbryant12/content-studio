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
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |

### Optional

| Variable | Description | Default |
|---|---|---|
| `STORAGE_TYPE` | Storage backend (`s3` / `local`) | `local` |
| `SERVER_REDIS_URL` | Redis for SSE pub/sub | `redis://localhost:6379` |
| `S3_BUCKET` | S3 bucket name | -- |
| `S3_REGION` | S3 region | -- |

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
