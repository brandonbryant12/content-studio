# Content Studio Developer Setup

This document is the practical setup and runbook for local development.
For engineering philosophy, read `README.md`.
For product/domain context, read `README.product.md`.

## Prerequisites

1. Node.js `>=22.10.0`
2. `corepack` enabled (to manage pnpm)
3. Docker (required for local infra and test DB workflows)

## Fast Start

```bash
# 1. Install dependencies
corepack enable
pnpm install

# 2. Generate env files interactively
./scripts/setup-env.sh

# 3. Start local infra (Postgres + Redis)
docker compose up -d

# 4. Apply schema
pnpm db:push

# 5. Run the workspace
pnpm dev
```

## Alternate Runtime: Full Docker Stack

```bash
# Builds and runs web, server, worker, postgres, redis, and minio
docker compose up --build
```

## Daily Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run all apps/packages in watch mode |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests |
| `pnpm test:invariants` | Run safety invariant suites |
| `pnpm build` | Build all packages |
| `pnpm spec:generate` | Regenerate spec artifacts |
| `pnpm spec:check` | Fail if spec and code drift |
| `pnpm db:push` | Push Drizzle schema |
| `pnpm test:e2e` | Run Playwright end-to-end tests |

## Local Pre-Merge Checklist

Run this sequence before opening or updating a PR:

```bash
pnpm spec:check
pnpm typecheck
pnpm lint
pnpm test
pnpm test:invariants
pnpm build
```

## Test Database Workflow

```bash
pnpm test:db:setup
pnpm --filter @repo/api test
pnpm test:db:down
```

## Environment Notes

1. `apps/server/.env` and `apps/worker/.env` must point at the same core infrastructure.
2. `PUBLIC_AUTH_MODE` in `apps/web/.env` should stay aligned with server `AUTH_MODE`.
3. `USE_MOCK_AI=true` is recommended for most local development unless testing live providers.

For full variable definitions, use:

1. `docs/setup.md`
2. `apps/server/.env.example`
3. `apps/web/.env.example`
4. `apps/worker/.env.example`

## Jenkins CI/CD References

1. Primary CI pipeline: `Jenkinsfile`
2. Main branch CI/CD: `jenkins/Jenkinsfile.main-cd.groovy`
3. Nightly hygiene: `jenkins/Jenkinsfile.nightly-hygiene.groovy`
4. Weekly maintenance: `jenkins/Jenkinsfile.weekly-maintenance.groovy`
5. Jenkins job setup guide: `jenkins/README.md`
