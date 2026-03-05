# EKS Ingress + Env Template (Split Frontend/Backend Domains)

This template assumes:

- frontend domain: `studio.example.com`
- backend domain: `api.example.com`
- Kubernetes ingress controller: `ingress-nginx`

For the required env-variable matrix across Linux Compose and EKS patterns, see:

- [`docs/architecture/deployment-env-matrix.md`](./deployment-env-matrix.md)

## Ingress Templates

### Backend Ingress (`api.example.com`)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: content-studio-server
  namespace: content-studio
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-example-com-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: content-studio-server
                port:
                  number: 3035
```

### Frontend Ingress (`studio.example.com`)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: content-studio-web
  namespace: content-studio
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - studio.example.com
      secretName: studio-example-com-tls
  rules:
    - host: studio.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: content-studio-web
                port:
                  number: 8080
```

## Backend Env Template

Use a `ConfigMap` for non-secret settings and a `Secret` for credentials.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: content-studio-server-env
  namespace: content-studio
data:
  NODE_ENV: "production"
  SERVER_HOST: "0.0.0.0"
  SERVER_PORT: "3035"

  PUBLIC_SERVER_URL: "https://api.example.com"
  PUBLIC_WEB_URL: "https://studio.example.com"
  PUBLIC_SERVER_API_PATH: "/api"

  AUTH_MODE: "sso-only"
  CORS_ORIGINS: "*"
  SERVER_RUN_DB_MIGRATIONS_ON_STARTUP: "true"

  TRUST_PROXY: "true"
  EXPOSE_DEEP_HEALTHCHECK: "false"

  STORAGE_PROVIDER: "s3"
  S3_REGION: "us-east-1"
  S3_BUCKET: "content-studio-prod"
  S3_ENDPOINT: "https://s3.us-east-1.amazonaws.com"
  S3_PUBLIC_ENDPOINT: "https://s3.us-east-1.amazonaws.com"

  AUTH_RATE_LIMIT_MAX: "120"
  AUTH_RATE_LIMIT_WINDOW_MS: "900000"

  AUDIO_PLAYBACK_PROXY_ENABLED: "true"
  AUDIO_PLAYBACK_URL_TTL_SECONDS: "900"

  # Corporate proxy (optional)
  HTTPS_PROXY: "http://proxy.corp.example:8080"
  HTTP_PROXY: "http://proxy.corp.example:8080"
  NO_PROXY: "localhost,127.0.0.1,.svc,.cluster.local"
  NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/corporate-ca.pem"
---
apiVersion: v1
kind: Secret
metadata:
  name: content-studio-server-secrets
  namespace: content-studio
type: Opaque
stringData:
  SERVER_AUTH_SECRET: "<replace>"
  SERVER_POSTGRES_URL: "<replace>"
  SERVER_REDIS_URL: "<replace>"
  GEMINI_API_KEY: "<replace-if-used>"

  AUTH_MICROSOFT_CLIENT_ID: "<replace>"
  AUTH_MICROSOFT_CLIENT_SECRET: "<replace>"
  AUTH_MICROSOFT_TENANT_ID: "<replace>"
  AUTH_ROLE_ADMIN_GROUP_IDS: "<replace-comma-separated-group-ids>"
  AUTH_ROLE_USER_GROUP_IDS: "<replace-comma-separated-group-ids>"

  S3_ACCESS_KEY_ID: "<replace>"
  S3_SECRET_ACCESS_KEY: "<replace>"

  AUDIO_PLAYBACK_SIGNING_SECRET: "<replace-32+-char-random-secret>"
```

## Frontend Env Template

`apps/web/entrypoint.sh` publishes all `PUBLIC_*` vars into runtime `env.js`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: content-studio-web-env
  namespace: content-studio
data:
  PORT: "8080"
  PUBLIC_SERVER_URL: "https://api.example.com"
  PUBLIC_SERVER_API_PATH: "/api"
  PUBLIC_AUTH_MODE: "sso-only"
  PUBLIC_BASE_PATH: "/"
```

## Deployment Notes

- If `HTTP_PROXY`/`HTTPS_PROXY` is set, `NODE_EXTRA_CA_CERTS` is now required.
- Keep `TRUST_PROXY=true` in production behind ingress so rate limiting and client IP logic are correct.
- `CORS_ORIGINS` defaults to `*`; set an explicit allowlist if you want stricter browser access control.
- `SERVER_RUN_DB_MIGRATIONS_ON_STARTUP=true` is the default simple path; for multi-replica rollouts, prefer a one-off migration job and set app pods to `false`.
- Keep S3 objects private and serve audio through signed backend playback URLs (`/api/audio/playback`).
