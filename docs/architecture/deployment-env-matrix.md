# Deployment Env Matrix (Linux Compose + EKS Split Domains)

This is the env reference for these two production-oriented deployment patterns:

1. Single Linux machine: `web + server + worker + db + redis + minio` (Docker Compose)
2. EKS: `web + server` only, with external PostgreSQL/Redis/S3

## Commands

For Linux Compose from repo root:

```bash
pnpm deploy:linux
pnpm redeploy:linux
```

## CORS Rule (Both Patterns)

Set `CORS_ORIGINS` to the exact public web origin(s), comma-separated.

Examples:

- same-origin domain: `CORS_ORIGINS=https://studio.example.com`
- split origins: `CORS_ORIGINS=https://studio.example.com`
- port-based local ingress: `CORS_ORIGINS=https://studio.example.com:8086`

Use explicit origins. Do not use `*` in production.

`pnpm deploy:linux` normalizes this value and auto-appends the configured web origin if missing.

## Common Required Env

Only list once here; these apply to both deployment patterns unless noted.

### Web (`apps/web` container)

Required:

- `PUBLIC_SERVER_URL`
- `PUBLIC_SERVER_API_PATH` (usually `/api`)
- `PUBLIC_AUTH_MODE` (keep aligned with server `AUTH_MODE`)

Optional:

- `PUBLIC_BASE_PATH` (default `/`)

### Server (`apps/server` container)

Required:

- `NODE_ENV` (`production` for prod)
- `SERVER_AUTH_SECRET`
- `AUTH_MODE` (`hybrid` or `sso-only` in production)
- `SERVER_POSTGRES_URL`
- `SERVER_REDIS_URL`
- `PUBLIC_SERVER_URL`
- `PUBLIC_WEB_URL`
- `CORS_ORIGINS`
- `TRUST_PROXY=true` (required in production)

Conditionally required:

- `AUTH_MICROSOFT_CLIENT_ID`, `AUTH_MICROSOFT_CLIENT_SECRET`, `AUTH_MICROSOFT_TENANT_ID`, `AUTH_ROLE_ADMIN_GROUP_IDS`, `AUTH_ROLE_USER_GROUP_IDS` when `AUTH_MODE=hybrid|sso-only`
- `GEMINI_API_KEY` when `USE_MOCK_AI=false`
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` when `STORAGE_PROVIDER=s3`
- `NODE_EXTRA_CA_CERTS` when `HTTPS_PROXY` or `HTTP_PROXY` is set

Common optional-but-important:

- `STORAGE_PROVIDER` (`s3` for both patterns in deployment)
- `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`
- `USE_MOCK_AI`
- `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `NODE_EXTRA_CA_CERTS`
- `AUTH_COOKIE_SAME_SITE`, `AUTH_COOKIE_SECURE`

## Special Notes By Pattern

### 1) Single Linux Machine (Compose, Same Domain)

Special behavior:

- `pnpm deploy:linux` generates `.env.deploy` and starts all services, including DB migrations and MinIO bucket init.
- Compose wires internal service URLs automatically (`db`, `redis`, `minio`).
- Web image builds with placeholder `PUBLIC_*`; real `PUBLIC_*` values are injected at runtime.

Minimal public URL alignment for same-domain deployment:

```env
PUBLIC_WEB_URL=https://studio.example.com
PUBLIC_SERVER_URL=https://studio.example.com
CORS_ORIGINS=https://studio.example.com
```

If you expose web/server on different ports, include the web port in `CORS_ORIGINS`.

### 2) EKS (Web + Server, External DB/Redis/S3, Split Domains)

Special requirements:

- `PUBLIC_WEB_URL` and `PUBLIC_SERVER_URL` are different origins.
- Set `AUTH_COOKIE_SAME_SITE=none` and `AUTH_COOKIE_SECURE=true`.
- `CORS_ORIGINS` must include the web origin (`https://studio.example.com`).
- `SERVER_POSTGRES_URL` and `SERVER_REDIS_URL` point to managed/external services.
- `S3_*` values point to external object storage (AWS S3 or compatible).

Typical split-domain core values:

```env
PUBLIC_WEB_URL=https://studio.example.com
PUBLIC_SERVER_URL=https://api.example.com
CORS_ORIGINS=https://studio.example.com
TRUST_PROXY=true
AUTH_COOKIE_SAME_SITE=none
AUTH_COOKIE_SECURE=true
```

For Kubernetes ingress templates, see:

- [`docs/architecture/eks-ingress-env-template.md`](./eks-ingress-env-template.md)
