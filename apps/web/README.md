# Web App (Content Studio)

React SPA built with Vite, TanStack Router, and Tailwind CSS.

## Development

```bash
pnpm dev       # Start Vite dev server (reads .env for PUBLIC_* vars)
pnpm build     # Production build
pnpm test      # Run unit tests
pnpm test:e2e  # Run Playwright e2e tests
```

## Environment Variables

| Variable                 | Required | Default                 | Description                                             |
| ------------------------ | -------- | ----------------------- | ------------------------------------------------------- |
| `PUBLIC_SERVER_URL`      | Yes      | —                       | Backend API server URL (e.g. `https://api.example.com`) |
| `PUBLIC_SERVER_API_PATH` | No       | `/api`                  | API endpoint path prefix                                |
| `PUBLIC_BASE_PATH`       | No       | `/`                     | App base path for sub-path deployments                  |
| `PUBLIC_WEB_URL`         | No       | `http://localhost:8085` | Vite dev server URL (dev only)                          |

In development, these are read from `.env` files via Vite's `import.meta.env`.

In production, `PUBLIC_*` vars are injected at **container startup** (not build time) so a single Docker image works across all environments.

## Docker

### Build

```bash
# No environment-specific args needed — one image for all envs
docker build -f apps/web/Dockerfile -t content-studio-web .
```

### Run

```bash
docker run -p 8080:8080 \
  -e PUBLIC_SERVER_URL=https://api.example.com \
  -e PUBLIC_SERVER_API_PATH=/api \
  content-studio-web
```

### How Runtime Config Works

1. The Vite build produces a static SPA with no baked-in environment values
2. `index.html` includes `<script src="/env.js">` before the app bundle
3. At container startup, `entrypoint.sh` reads all `PUBLIC_*` env vars and writes them to `dist/env.js` as `globalThis.__ENV__`
4. The app's `env.ts` merges `globalThis.__ENV__` (runtime) over `import.meta.env` (dev), then validates with Effect Schema
5. A lightweight Node.js static file server (`serve.js`) serves the SPA with proper MIME types, SPA fallback routing, and a `/healthcheck` endpoint

### Kubernetes / EKS

The container runs a Node.js static file server directly — no nginx or reverse proxy required. Set `PUBLIC_*` env vars in your Pod spec or ConfigMap:

```yaml
env:
  - name: PUBLIC_SERVER_URL
    value: 'https://api.example.com'
  - name: PUBLIC_SERVER_API_PATH
    value: '/api'
```

The server listens on port `8080` (configurable via `PORT` env var) and exposes `/healthcheck` for liveness/readiness probes.
