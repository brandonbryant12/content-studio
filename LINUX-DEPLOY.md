# Linux Docker Compose Deploy Guide

This guide is for bringing Content Studio up on a fresh Linux VM using Docker Compose.

## What You Get

Running `pnpm deploy:linux` (or `./deploy`) will:

- prompt for domain/host, runtime mode, ports, auth, AI, CORS, telemetry
- prompt for browser-visible public URLs separately from internal bind ports
- normalize CORS and always include the configured web origin
- generate `.env.deploy` at repo root (mode `600`)
- run in an isolated Compose project by default so deploy state does not reuse local-dev volumes
- build and start `web`, `server`, `worker`, `db`, `redis`, `minio`
- run DB migrations during `server` startup before the API starts serving traffic
- create the MinIO bucket via `minio-init`
- build `web` with placeholder `PUBLIC_*` values; inject real `PUBLIC_*` values at runtime via `env.js`

## Prerequisites

- Docker Engine 24+
- Docker Compose v2 (`docker compose version`)
- Git
- `openssl` (used to generate a default auth secret)

## Fresh VM Quick Start

```bash
# 1) Clone
git clone <repo-url> content-studio
cd content-studio

# 2) Run interactive deploy
pnpm deploy:linux
```

The script asks for:

- `HOST_IP`: host/IP/domain (no `http://` or `https://` prefix)
- `DEPLOY_NODE_ENV`: `development` (default) or `production`
- `PUBLIC_URL_SCHEME`: `http` or `https`
- app/service ports
- auth mode + SSO vars when required
- AI mode (`USE_MOCK_AI`) and optional Gemini key
- CORS allowlist and optional telemetry settings
- optional outbound proxy settings (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `NODE_EXTRA_CA_CERTS`)

## Runtime Modes

- `development`:
  - allows `AUTH_MODE=dev-password`
  - allows HTTP URLs
  - best for first boot on a new VM
- `production`:
  - enforces `PUBLIC_URL_SCHEME=https`
  - enforces non-dev auth mode (`sso-only`)
  - enforces `TRUST_PROXY=true`

If you pick `production`, ensure TLS termination + reverse proxy are already in place.

## Generated Config

`pnpm deploy:linux` writes `.env.deploy`. Re-run `pnpm deploy:linux` anytime to update values.

For required env variables across Linux and EKS deployment patterns, see:

- [`docs/architecture/deployment-env-matrix.md`](./docs/architecture/deployment-env-matrix.md)

Important generated keys include:

- `COMPOSE_PROJECT_NAME` (defaults to `content-studio-deploy`)
- `DEPLOY_NODE_ENV`
- `PUBLIC_URL_SCHEME`
- `PUBLIC_WEB_URL`
- `PUBLIC_SERVER_URL`
- `CONTENT_STUDIO_POSTGRES_*` for internal PostgreSQL auth used by Compose
- `CONTENT_STUDIO_S3_*` for internal MinIO auth used by Compose
- `TRUST_PROXY`
- `WEB_PORT`, `SERVER_PORT`, `POSTGRES_PORT`, `REDIS_PORT`, `MINIO_API_PORT`, `MINIO_UI_PORT`
- `WEB_BIND_IP`, `SERVER_BIND_IP`
- `POSTGRES_BIND_IP`, `REDIS_BIND_IP`
- `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `NODE_EXTRA_CA_CERTS`

Defaults for data services are local-only binds:

- PostgreSQL: `POSTGRES_BIND_IP=127.0.0.1`
- Redis: `REDIS_BIND_IP=127.0.0.1`

Set either to `0.0.0.0` only if you explicitly need external access.

## Verify After Deploy

```bash
# Container status
docker compose --env-file .env.deploy ps

# Server + worker logs
docker compose --env-file .env.deploy logs -f server
docker compose --env-file .env.deploy logs -f worker

# One-shot setup job
docker compose --env-file .env.deploy logs minio-init
```

Expected one-shot behavior:

- `minio-init` exits successfully after bucket setup
- `server` logs `Database migrations completed` before serving traffic

## Endpoints

`./deploy` prints the final browser-visible public URLs plus the local bind
ports that Docker publishes on the VM.

Typical defaults:

- Web: `http://<HOST_IP>:8086`
- API: `http://<HOST_IP>:3036`
- MinIO S3 API: `http://<HOST_IP>:9001`
- MinIO Console: `http://<HOST_IP>:9090`

For same-host HTTPS ingress via nginx, a common shape is:

- `PUBLIC_WEB_URL=https://mydomain.com`
- `PUBLIC_SERVER_URL=https://mydomain.com`
- `WEB_BIND_IP=127.0.0.1`
- `SERVER_BIND_IP=127.0.0.1`
- `WEB_PORT=8086`
- `SERVER_PORT=3036`

That means browsers only ever see `https://mydomain.com`, while nginx
proxies `/` to the web container and `/api` plus `/storage` to the server
container on loopback.

## Nginx Reverse Proxy (HTTPS CNAME)

If you are fronting the stack with nginx on the same VM, use `production`
mode in `./deploy` and set:

```env
HOST_IP=mydomain.com
PUBLIC_URL_SCHEME=https
DEPLOY_NODE_ENV=production
TRUST_PROXY=true
AUTH_MODE=sso-only
WEB_BIND_IP=127.0.0.1
SERVER_BIND_IP=127.0.0.1
WEB_PORT=8086
SERVER_PORT=3036
PUBLIC_WEB_URL=https://mydomain.com
PUBLIC_SERVER_URL=https://mydomain.com
CORS_ORIGINS=https://mydomain.com
```

Why this matters:

- `PUBLIC_WEB_URL` and `PUBLIC_SERVER_URL` are what the browser, auth flows,
  and signed media URLs use.
- `WEB_PORT` and `SERVER_PORT` are only the local VM ports nginx proxies to.
- `TRUST_PROXY=true` is required so the app respects `X-Forwarded-*` headers.

Recommended nginx config:

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 80;
  listen [::]:80;
  server_name mydomain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name mydomain.com;

  ssl_certificate /etc/letsencrypt/live/mydomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/mydomain.com/privkey.pem;

  client_max_body_size 100m;

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Port 443;
  proxy_http_version 1.1;

  location /api/ {
    proxy_pass http://127.0.0.1:3036/api/;
    proxy_buffering off;
    proxy_read_timeout 3600s;
  }

  location /storage/ {
    proxy_pass http://127.0.0.1:3036/storage/;
    proxy_read_timeout 3600s;
  }

  location = /server-healthcheck {
    proxy_pass http://127.0.0.1:3036/healthcheck;
  }

  location / {
    proxy_pass http://127.0.0.1:8086/;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }
}
```

Notes:

- `proxy_buffering off` on `/api/` avoids breaking SSE/streaming responses.
- If you split web and API onto different hostnames later, keep
  `PUBLIC_WEB_URL` and `PUBLIC_SERVER_URL` aligned with those external origins
  instead of the loopback proxy targets.

## Firewall (UFW) Example

Open only what you need publicly:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 9001/tcp
sudo ufw allow 9090/tcp
sudo ufw status numbered
```

If nginx is your only public ingress, keep `WEB_PORT` and `SERVER_PORT`
loopback-bound and do not open them in the firewall.

## Common Operations

```bash
# Re-deploy using existing .env.deploy
pnpm deploy:linux

# Pull latest code + re-deploy using existing .env.deploy
pnpm redeploy:linux

# Tail all logs
docker compose --env-file .env.deploy logs -f

# Stop stack
docker compose --env-file .env.deploy down

# Full reset (containers + volumes)
docker compose --env-file .env.deploy down -v
```

`pnpm redeploy:linux` performs `git pull --ff-only` and then runs `pnpm deploy:linux` with your existing `.env.deploy`.

## Troubleshooting

**Server fails at startup with env validation errors**

- Use `pnpm deploy:linux` and choose settings consistent with mode:
  - `development`: HTTP + `dev-password` is valid
  - `production`: requires HTTPS + SSO mode + `TRUST_PROXY=true`

**Web cannot reach API**

- Confirm `PUBLIC_SERVER_URL` in `.env.deploy` matches reachable host/port
- Check firewall rules for the API port

**MinIO object URLs are unreachable from browser**

- Ensure `HOST_IP` is set to a reachable host/domain (not internal-only)
- Check `MINIO_API_PORT` firewall/routing

**Startup error: `NODE_EXTRA_CA_CERTS is required when HTTPS_PROXY or HTTP_PROXY is configured`**

- Re-run `pnpm deploy:linux` and set `NODE_EXTRA_CA_CERTS` to a valid CA bundle path on the VM
