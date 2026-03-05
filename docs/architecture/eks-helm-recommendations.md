# EKS Deployment Recommendations (Helm-First)

This document defines the recommended production deployment model for Content Studio on EKS.
It assumes split frontend/backend domains (`studio.*` and `api.*`) and external PostgreSQL/Redis/S3.

## Recommendation Summary

1. Use Helm charts as the default deployment mechanism.
2. Keep bearer-only auth transport (`Authorization` header), with cookie fallback disabled.
3. Keep permissive CORS (`CORS_ORIGINS=*`) as the default unless compliance requires an allowlist.
4. Run DB migrations in a controlled release step (details below).

## Recommended Chart Topology

Recommended default: one umbrella chart with app subcharts.

```text
charts/
  content-studio/                 # umbrella release
    Chart.yaml
    values.yaml
    templates/
      namespace.yaml
      externalsecret-server.yaml
    charts/
      web/
      server/
      # worker/ (optional, if/when EKS deployment includes worker runtime)
```

Why this is the default:

1. Single release version for tightly coupled web/server changes.
2. Shared values and secrets mapping in one place.
3. Easier rollback and audit (`helm history`/`helm rollback` on one release).

## Values Contract (Minimum)

| Values Key | Purpose |
|---|---|
| `global.publicWebUrl` | `PUBLIC_WEB_URL` |
| `global.publicServerUrl` | `PUBLIC_SERVER_URL` |
| `server.authMode` | `AUTH_MODE` |
| `server.corsOrigins` | `CORS_ORIGINS` (default `*`) |
| `server.runDbMigrationsOnStartup` | `SERVER_RUN_DB_MIGRATIONS_ON_STARTUP` |
| `server.trustProxy` | `TRUST_PROXY` |
| `server.secretsRef` | Secret reference for auth/db/redis/provider credentials |
| `ingress.web.host` | Web ingress host |
| `ingress.server.host` | API ingress host |

## Migration Strategy

### Current Safe Default (Supported Today)

1. Keep `SERVER_RUN_DB_MIGRATIONS_ON_STARTUP=true`.
2. Use controlled rollout when applying schema changes (avoid large parallel server pod starts).
3. Fail the rollout if migrations fail (server exits non-zero before serving traffic).

### Recommended Target for Scale

1. Introduce a migration-only runtime command in the server image (for example `node /app/dist/migrate.mjs`).
2. Run it as a Helm `pre-install,pre-upgrade` hook Job.
3. Set `server.runDbMigrationsOnStartup=false` for normal app pods once the hook job is in place.

Example hook metadata pattern:

```yaml
metadata:
  annotations:
    helm.sh/hook: pre-install,pre-upgrade
    helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded
```

## Release Policy

1. Use `helm upgrade --install ... --atomic --wait`.
2. Keep DB migrations backward-compatible with at least one release step (expand/contract pattern).
3. Promote by values files (`values-dev.yaml`, `values-staging.yaml`, `values-prod.yaml`) instead of manifest drift.

## Auth and Network Defaults

1. `CORS_ORIGINS=*` is the deployment default for bearer-token browser calls.
2. `TRUST_PROXY=true` is required behind ingress.
3. No cookie auth fallback is used.

## Implementation Follow-Ups

1. Add a migration-only entrypoint in `apps/server` image so Helm hook Jobs can run without starting HTTP listeners.
2. Add first-party charts under `charts/content-studio` with separate web/server templates and values schema.
3. Add CI checks: `helm lint` and `helm template` against prod values.
