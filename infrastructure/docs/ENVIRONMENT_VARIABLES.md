# Environment Variables Reference

Complete reference for all environment variables used in Content Studio.

## Table of Contents

- [Server Configuration](#server-configuration)
- [Storage Configuration](#storage-configuration)
- [SSE and Redis Configuration](#sse-and-redis-configuration)
- [Observability Configuration](#observability-configuration)
- [AI Configuration](#ai-configuration)
- [Web Frontend Configuration](#web-frontend-configuration)
- [Kubernetes Configuration](#kubernetes-configuration)

---

## Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERVER_HOST` | No | `localhost` | Host address to bind the server |
| `SERVER_PORT` | No | `3000` | Port number for the server |
| `SERVER_AUTH_SECRET` | **Yes** | - | JWT secret for session signing (min 1 char, use 32+ chars in production) |
| `SERVER_POSTGRES_URL` | **Yes** | - | PostgreSQL connection URL |
| `PUBLIC_SERVER_URL` | **Yes** | - | Public URL for the API server (used by frontend) |
| `PUBLIC_SERVER_API_PATH` | No | `/api` | API path prefix |
| `PUBLIC_WEB_URL` | **Yes** | - | Public URL for the web frontend (used for CORS) |
| `MODE` | No | `server` | Run mode: `server` (HTTP only) or `worker` (job processing only) |
| `WORKER_MODE` | No | `false` | Alternative to MODE - set to `true` for worker-only mode |

### Example Values

```bash
# Local development
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
SERVER_AUTH_SECRET=local-development-secret-change-in-production
SERVER_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres
PUBLIC_SERVER_URL=http://localhost:3035
PUBLIC_SERVER_API_PATH=/api
PUBLIC_WEB_URL=http://localhost:8085

# Production
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
SERVER_AUTH_SECRET=<secure-random-32-char-string>
SERVER_POSTGRES_URL=postgres://user:password@db.example.com:5432/content_studio
PUBLIC_SERVER_URL=https://api.content-studio.example.com
PUBLIC_SERVER_API_PATH=/api
PUBLIC_WEB_URL=https://content-studio.example.com
```

---

## Storage Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | `database` | Storage backend: `database`, `filesystem`, `s3`, or `memory` |
| `STORAGE_PATH` | For filesystem | - | Local path for filesystem storage |
| `STORAGE_BASE_URL` | For filesystem | - | Base URL for filesystem storage access |
| `S3_BUCKET` | For S3 | - | S3 bucket name |
| `S3_REGION` | For S3 | - | AWS region (e.g., `us-east-1`) |
| `S3_ACCESS_KEY_ID` | For S3 | - | AWS access key ID (or use IRSA) |
| `S3_SECRET_ACCESS_KEY` | For S3 | - | AWS secret access key (or use IRSA) |
| `S3_ENDPOINT` | No | - | Custom S3 endpoint (for MinIO or S3-compatible storage) |

### Example Values

```bash
# Database storage (default)
STORAGE_PROVIDER=database

# S3 storage
STORAGE_PROVIDER=s3
S3_BUCKET=content-studio-assets
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# MinIO (S3-compatible)
STORAGE_PROVIDER=s3
S3_BUCKET=content-studio
S3_REGION=us-east-1
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin

# Memory storage (testing only)
STORAGE_PROVIDER=memory
```

---

## SSE and Redis Configuration

Server-Sent Events (SSE) require Redis when running multiple server replicas for cross-instance communication.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SSE_ADAPTER` | No | `memory` | SSE adapter: `memory` (single instance) or `redis` (multi-replica) |
| `REDIS_URL` | When SSE_ADAPTER=redis | - | Redis connection URL |

### Example Values

```bash
# Local development (single instance)
SSE_ADAPTER=memory

# Multi-replica deployment
SSE_ADAPTER=redis
REDIS_URL=redis://redis:6379

# Redis with authentication
REDIS_URL=redis://:password@redis:6379
```

---

## Observability Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OTEL_SERVICE_NAME` | No | `content-studio` | OpenTelemetry service name |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | - | OpenTelemetry OTLP endpoint |
| `DD_ENV` | No | - | Datadog environment tag |
| `DD_SERVICE` | No | `content-studio` | Datadog service name |
| `DD_VERSION` | No | - | Datadog version tag |
| `DD_API_KEY` | For Datadog | - | Datadog API key |

### Example Values

```bash
# OpenTelemetry (Jaeger, etc.)
OTEL_SERVICE_NAME=content-studio
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317

# Datadog
DD_ENV=production
DD_SERVICE=content-studio
DD_VERSION=1.0.0
DD_API_KEY=<datadog-api-key>
OTEL_EXPORTER_OTLP_ENDPOINT=http://datadog-agent:4317
```

---

## AI Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | **Yes** | - | Google Gemini API key for AI features |
| `USE_MOCK_AI` | No | `true` in dev, `false` in prod | Use mock AI services instead of real API |

### Example Values

```bash
# Local development (mock AI, no API costs)
USE_MOCK_AI=true
GEMINI_API_KEY=dummy-key

# Production (real AI)
USE_MOCK_AI=false
GEMINI_API_KEY=AIzaSy...your-actual-key
```

---

## Web Frontend Configuration

These are build-time variables passed as Docker build arguments.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PUBLIC_SERVER_URL` | **Yes** | - | Backend API server URL |
| `PUBLIC_SERVER_API_PATH` | No | `/api` | API path prefix |
| `PUBLIC_BASE_PATH` | No | `/` | Base path for the web app |

### Example Values

```bash
# Docker build arguments
docker build \
  --build-arg PUBLIC_SERVER_URL=http://localhost:3035 \
  --build-arg PUBLIC_SERVER_API_PATH=/api \
  -f apps/web/Dockerfile .
```

---

## Kubernetes Configuration

### ConfigMap vs Secret

Use **ConfigMap** for non-sensitive configuration:
- `SERVER_HOST`
- `SERVER_PORT`
- `PUBLIC_SERVER_URL`
- `PUBLIC_SERVER_API_PATH`
- `PUBLIC_WEB_URL`
- `STORAGE_PROVIDER`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT`
- `SSE_ADAPTER`
- `USE_MOCK_AI`
- `OTEL_SERVICE_NAME`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `DD_ENV`
- `DD_SERVICE`
- `DD_VERSION`

Use **Secret** for sensitive values:
- `SERVER_AUTH_SECRET`
- `SERVER_POSTGRES_URL`
- `GEMINI_API_KEY`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `DD_API_KEY`
- `REDIS_URL` (if it contains password)

### Helm Values Configuration

The Helm chart automatically generates ConfigMap and Secret resources. Configure via `values.yaml`:

```yaml
# ConfigMap values
publicServerUrl: "https://api.example.com"
publicServerApiPath: "/api"
publicWebUrl: "https://example.com"

storage:
  provider: s3
  s3:
    bucket: my-bucket
    region: us-east-1

sse:
  adapter: redis

useMockAI: false

observability:
  otlpEndpoint: "http://datadog-agent:4317"

# Secret values
secrets:
  create: true  # Set to false to use existingSecret
  authSecret: "your-jwt-secret"
  postgresUrl: "postgres://user:pass@host:5432/db"
  geminiApiKey: "your-api-key"
  s3AccessKeyId: "AKIA..."
  s3SecretAccessKey: "..."
  datadogApiKey: "..."

# Or reference an existing secret
secrets:
  create: false
  existingSecret: my-external-secret
```

### Using AWS IRSA for S3

Instead of storing S3 credentials in secrets, use IAM Roles for Service Accounts:

```yaml
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/content-studio-role

# No need for S3 credentials
secrets:
  s3AccessKeyId: ""
  s3SecretAccessKey: ""
```

### External Secrets (Production Recommended)

For production, use External Secrets Operator with AWS Secrets Manager:

```yaml
secrets:
  create: false
  existingSecret: content-studio-secrets  # Created by ExternalSecret
```

Create an ExternalSecret resource that syncs from AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: content-studio-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: content-studio-secrets
  data:
    - secretKey: SERVER_AUTH_SECRET
      remoteRef:
        key: content-studio/prod
        property: auth_secret
    - secretKey: SERVER_POSTGRES_URL
      remoteRef:
        key: content-studio/prod
        property: postgres_url
    - secretKey: GEMINI_API_KEY
      remoteRef:
        key: content-studio/prod
        property: gemini_api_key
```
