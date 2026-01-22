# Task 11: Write Comprehensive Deployment Documentation

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/implementation-plan.md` - Documentation style

## Context

Create comprehensive documentation that enables the DevOps team to deploy Content Studio to EKS without additional guidance. Documentation should explain:
- What the system is and how it works
- Why certain technology choices were made
- How to deploy to each environment
- How to troubleshoot common issues

## Key Files

- `infrastructure/README.md` - Overview and quick start
- `infrastructure/docs/ARCHITECTURE.md` - System architecture
- `infrastructure/docs/ENVIRONMENT_VARIABLES.md` - Complete env var reference
- `infrastructure/docs/LOCAL_TESTING.md` - Kind cluster guide
- `infrastructure/docs/EKS_DEPLOYMENT.md` - EKS deployment steps
- `infrastructure/docs/JENKINS_SETUP.md` - Jenkins configuration
- `infrastructure/docs/TROUBLESHOOTING.md` - Common issues

## Implementation Steps

### 11.1 Create Main README

Create `infrastructure/README.md`:

```markdown
# Content Studio Infrastructure

Kubernetes deployment infrastructure for Content Studio - an AI-powered podcast generation platform.

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System design and components |
| [Environment Variables](./docs/ENVIRONMENT_VARIABLES.md) | Configuration reference |
| [Local Testing](./docs/LOCAL_TESTING.md) | Test with Kind cluster |
| [EKS Deployment](./docs/EKS_DEPLOYMENT.md) | Deploy to AWS EKS |
| [Jenkins Setup](./docs/JENKINS_SETUP.md) | CI/CD configuration |
| [Troubleshooting](./docs/TROUBLESHOOTING.md) | Common issues and solutions |

## Tech Stack Overview

### Backend
- **Runtime**: Node.js 22 with Effect TS
- **Framework**: Hono (lightweight, fast HTTP framework)
- **API**: oRPC (type-safe RPC)
- **Database**: PostgreSQL with Drizzle ORM
- **Queue**: Custom job queue with PostgreSQL backend

### Frontend
- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router (file-based, type-safe)
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite 7

### Infrastructure
- **Container Runtime**: Docker
- **Orchestration**: Kubernetes (EKS)
- **Ingress**: AWS ALB
- **CI/CD**: Jenkins
- **Observability**: OpenTelemetry → Datadog

## Quick Start

### Local Development (without Kubernetes)

```bash
# Start database
docker-compose up -d db

# Install dependencies
pnpm install

# Run development servers
pnpm dev
```

### Local Kubernetes Testing

```bash
# Create Kind cluster and deploy
./infrastructure/kind/setup.sh

# Access at http://localhost
```

### Deploy to EKS

```bash
# Ensure kubectl is configured for your cluster
aws eks update-kubeconfig --name your-cluster --region us-east-1

# Deploy to dev environment
helm upgrade --install content-studio ./infrastructure/helm/content-studio \
  -f ./infrastructure/helm/content-studio/values-dev.yaml \
  -n content-studio-dev --create-namespace
```

## Directory Structure

```
infrastructure/
├── README.md                 # This file
├── helm/
│   └── content-studio/       # Helm chart
│       ├── Chart.yaml
│       ├── values.yaml       # Base values
│       ├── values-local.yaml # Kind testing
│       ├── values-dev.yaml   # EKS dev
│       ├── values-staging.yaml
│       ├── values-prod.yaml
│       └── templates/        # K8s manifests
├── kind/
│   ├── kind-config.yaml      # Kind cluster config
│   ├── setup.sh              # Create cluster
│   └── teardown.sh           # Delete cluster
└── docs/                     # Documentation
```

## Support

For issues with:
- **Application bugs**: Create issue in main repository
- **Deployment issues**: Contact DevOps team
- **Infrastructure changes**: Submit PR to this repository
```

### 11.2 Create Architecture Document

Create `infrastructure/docs/ARCHITECTURE.md`:

```markdown
# System Architecture

## Overview

Content Studio is a monorepo application with three main deployable components:

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS EKS Cluster                          │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │    Web      │    │   Server    │    │      Worker         │ │
│  │  (Nginx)    │    │   (Hono)    │    │  (Job Processor)    │ │
│  │             │    │             │    │                     │ │
│  │  React SPA  │───►│  REST API   │◄──►│  Podcast Gen        │ │
│  │  Static     │    │  Auth       │    │  Script Gen         │ │
│  │  Files      │    │  SSE Events │    │  Audio Gen          │ │
│  └─────────────┘    └──────┬──────┘    └──────────┬──────────┘ │
│         │                  │                      │             │
│         │                  ▼                      │             │
│         │           ┌─────────────┐               │             │
│         │           │    Redis    │◄──────────────┘             │
│         │           │  (Pub/Sub)  │                             │
│         │           └─────────────┘                             │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │ PostgreSQL  │     │     S3      │     │  Gemini AI  │
    │   (RDS)     │     │  (Storage)  │     │   (Google)  │
    └─────────────┘     └─────────────┘     └─────────────┘
```

## Components

### Web (Frontend)
- **Technology**: React 19 + Vite
- **Deployment**: Nginx container serving static files
- **Purpose**: User interface for managing podcasts

**Why Vite?**
- Fastest build times in the ecosystem
- Native ES modules support
- Excellent HMR (Hot Module Replacement)
- Built-in code splitting

### Server (API)
- **Technology**: Hono + Effect TS
- **Deployment**: Node.js container
- **Purpose**: REST API, authentication, real-time events

**Why Hono?**
- Ultra-lightweight (~14KB)
- Web standard compatible (Request/Response)
- Excellent TypeScript support
- Multi-runtime (Node, Deno, Cloudflare Workers)

**Why Effect TS?**
- Type-safe error handling
- Built-in dependency injection
- Composable async operations
- Automatic tracing/telemetry

### Worker (Background Jobs)
- **Technology**: Same as Server (different mode)
- **Deployment**: Node.js container with `--mode=worker`
- **Purpose**: Process long-running jobs (AI generation)

**Why separate workers?**
- Independent scaling based on queue depth
- Isolates CPU-intensive work from API latency
- Can be deployed in different regions/zones

### Redis
- **Purpose**: Pub/Sub for SSE events across server replicas
- **Why needed**: Multiple server pods need to share events

### External Services

| Service | Purpose | Why |
|---------|---------|-----|
| PostgreSQL | Primary database | ACID compliance, complex queries |
| S3 | File storage | Scalable, cost-effective media storage |
| Gemini AI | LLM + TTS | Google's multimodal AI for content generation |

## Data Flow

### User Request Flow
```
User → ALB → Ingress → Web Service → Nginx → Static Files
                    → Server Service → Hono → PostgreSQL
```

### Job Processing Flow
```
User creates podcast
    → Server enqueues job (PostgreSQL)
    → Worker polls queue
    → Worker processes (Gemini AI)
    → Worker stores result (S3)
    → Worker emits SSE event (Redis)
    → Server broadcasts to user
    → Frontend updates UI
```

### Real-Time Events Flow
```
Worker completes job
    → Emits to Redis pub/sub
    → All Server pods receive
    → Servers forward to connected clients (SSE)
    → Frontend receives event
    → TanStack Query invalidates cache
    → UI updates automatically
```

## Scaling Considerations

### Horizontal Scaling
- **Web**: Stateless, scales easily
- **Server**: Stateless with Redis for SSE
- **Worker**: Stateless, scales with queue depth

### Bottlenecks
1. **Database**: Use read replicas if needed
2. **AI API**: Rate limits from Google
3. **S3**: Virtually unlimited

### Resource Allocation

| Component | CPU Request | Memory Request | Scaling Metric |
|-----------|-------------|----------------|----------------|
| Web | 50m | 64Mi | CPU |
| Server | 250m | 512Mi | CPU + Memory |
| Worker | 500m | 1Gi | CPU |
```

### 11.3 Create Environment Variables Document

Create `infrastructure/docs/ENVIRONMENT_VARIABLES.md`:

```markdown
# Environment Variables Reference

Complete reference for all environment variables used by Content Studio.

## Server Variables

### Required

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `SERVER_AUTH_SECRET` | string | `your-secret-key` | JWT signing secret. Use a strong random value (32+ chars) |
| `SERVER_POSTGRES_URL` | string | `postgres://user:pass@host:5432/db` | PostgreSQL connection string |
| `GEMINI_API_KEY` | string | `AIzaSy...` | Google AI API key for LLM and TTS |
| `PUBLIC_SERVER_URL` | URL | `https://api.example.com` | Public URL for the API server |
| `PUBLIC_WEB_URL` | URL | `https://example.com` | Public URL for the frontend (CORS) |

### Optional

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SERVER_HOST` | string | `localhost` | Bind hostname |
| `SERVER_PORT` | number | `3035` | HTTP port (0-65535) |
| `PUBLIC_SERVER_API_PATH` | string | `/api` | API path prefix |
| `USE_MOCK_AI` | boolean | `true` (dev) | Use mock AI services |
| `NODE_ENV` | string | `development` | Node environment |

### Storage

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `STORAGE_PROVIDER` | enum | `database` | `database`, `filesystem`, or `s3` |
| `STORAGE_PATH` | string | - | Path for filesystem provider |
| `STORAGE_BASE_URL` | URL | - | Public URL for filesystem |
| `S3_BUCKET` | string | - | S3 bucket name |
| `S3_REGION` | string | - | AWS region |
| `S3_ACCESS_KEY_ID` | string | - | AWS access key |
| `S3_SECRET_ACCESS_KEY` | string | - | AWS secret key |
| `S3_ENDPOINT` | URL | - | Custom endpoint (R2, MinIO) |

### SSE / Redis

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SSE_ADAPTER` | enum | `memory` | `memory` or `redis` |
| `REDIS_URL` | string | - | Redis connection URL |

### Observability

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OTEL_SERVICE_NAME` | string | `content-studio` | Service name for tracing |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | URL | - | OTLP collector endpoint |
| `DD_ENV` | string | - | Datadog environment tag |
| `DD_SERVICE` | string | - | Datadog service name |
| `DD_VERSION` | string | - | Datadog version tag |
| `DD_API_KEY` | string | - | Datadog API key |

## Frontend Variables

All frontend variables must be prefixed with `PUBLIC_` (Vite configuration).

| Variable | Type | Default | When | Description |
|----------|------|---------|------|-------------|
| `PUBLIC_SERVER_URL` | URL | - | Build | API server URL (embedded in bundle) |
| `PUBLIC_SERVER_API_PATH` | string | `/api` | Build | API path prefix |
| `PUBLIC_BASE_PATH` | string | `/` | Build | Base path for deployment |
| `PUBLIC_WEB_URL` | URL | `http://localhost:8085` | Dev | Vite dev server URL |

## Environment Templates

### Local Development

```bash
# apps/server/.env
SERVER_HOST=localhost
SERVER_PORT=3035
SERVER_AUTH_SECRET=dev-secret-change-me
SERVER_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/content_studio
PUBLIC_SERVER_URL=http://localhost:3035
PUBLIC_SERVER_API_PATH=/api
PUBLIC_WEB_URL=http://localhost:8085
GEMINI_API_KEY=your-api-key
USE_MOCK_AI=true
STORAGE_PROVIDER=database
SSE_ADAPTER=memory
```

### Production (Kubernetes Secrets)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: content-studio-secrets
type: Opaque
stringData:
  SERVER_AUTH_SECRET: "production-secret-32-chars-minimum"
  SERVER_POSTGRES_URL: "postgres://user:pass@rds-endpoint:5432/content_studio"
  GEMINI_API_KEY: "AIzaSy..."
  S3_ACCESS_KEY_ID: "AKIA..."
  S3_SECRET_ACCESS_KEY: "..."
  DD_API_KEY: "..."
```

## Validation

Environment variables are validated at startup using Effect Schema:

```typescript
// apps/server/src/env.ts
import { Schema } from 'effect';

const ServerPort = Schema.optional(
  Schema.NumberFromString.pipe(
    Schema.int(),
    Schema.between(0, 65535)
  )
).pipe(Schema.withDefault(() => 3035));
```

If validation fails, the server will not start and will log which variables are invalid.
```

### 11.4 Create EKS Deployment Document

Create `infrastructure/docs/EKS_DEPLOYMENT.md`:

```markdown
# EKS Deployment Guide

Step-by-step guide to deploy Content Studio to Amazon EKS.

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **kubectl** installed and configured
3. **Helm 3.x** installed
4. **eksctl** (optional, for cluster creation)

### Required AWS Resources

- EKS Cluster (v1.29+)
- RDS PostgreSQL instance
- S3 bucket for media storage
- ACM certificate for HTTPS
- ECR repositories for Docker images

## Step 1: Configure kubectl

```bash
aws eks update-kubeconfig --name your-cluster-name --region us-east-1
kubectl get nodes  # Verify connection
```

## Step 2: Install AWS Load Balancer Controller

The ALB Ingress Controller is required for AWS ALB integration.

```bash
# Create IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=your-cluster-name \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::ACCOUNT:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Install controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=your-cluster-name \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## Step 3: Create Kubernetes Secrets

Create secrets for each environment:

```bash
# Development
kubectl create namespace content-studio-dev

kubectl create secret generic content-studio-secrets \
  --namespace content-studio-dev \
  --from-literal=SERVER_AUTH_SECRET='your-dev-secret' \
  --from-literal=SERVER_POSTGRES_URL='postgres://...' \
  --from-literal=GEMINI_API_KEY='AIzaSy...' \
  --from-literal=S3_ACCESS_KEY_ID='AKIA...' \
  --from-literal=S3_SECRET_ACCESS_KEY='...' \
  --from-literal=DD_API_KEY='...'
```

## Step 4: Update Helm Values

Edit the appropriate values file (`values-dev.yaml`, `values-staging.yaml`, `values-prod.yaml`):

```yaml
# Required updates:
publicServerUrl: "https://api-dev.your-domain.com"
publicWebUrl: "https://dev.your-domain.com"

server:
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-server
    tag: latest

web:
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-web
    tag: latest

ingress:
  annotations:
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789012:certificate/..."
  host: dev.your-domain.com

storage:
  s3:
    bucket: your-bucket-name
    region: us-east-1

secrets:
  existingSecret: content-studio-secrets
```

## Step 5: Deploy with Helm

```bash
# Lint chart first
helm lint ./infrastructure/helm/content-studio

# Deploy to dev
helm upgrade --install content-studio \
  ./infrastructure/helm/content-studio \
  -f ./infrastructure/helm/content-studio/values-dev.yaml \
  -n content-studio-dev \
  --wait \
  --timeout 10m

# Verify deployment
kubectl get pods -n content-studio-dev
kubectl get ingress -n content-studio-dev
```

## Step 6: Configure DNS

After deployment, get the ALB DNS name:

```bash
kubectl get ingress content-studio -n content-studio-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Create a CNAME record in Route 53 (or your DNS provider):
- `dev.your-domain.com` → ALB DNS name

## Step 7: Verify Deployment

```bash
# Check pod status
kubectl get pods -n content-studio-dev

# Check logs
kubectl logs -l app.kubernetes.io/component=server -n content-studio-dev

# Test endpoints
curl https://dev.your-domain.com/healthcheck
curl https://dev.your-domain.com/api/healthcheck
```

## Upgrading

```bash
# Update image tag and upgrade
helm upgrade content-studio \
  ./infrastructure/helm/content-studio \
  -f ./infrastructure/helm/content-studio/values-dev.yaml \
  -n content-studio-dev \
  --set server.image.tag=new-tag \
  --set web.image.tag=new-tag
```

## Rollback

```bash
# List revisions
helm history content-studio -n content-studio-dev

# Rollback to previous
helm rollback content-studio -n content-studio-dev

# Rollback to specific revision
helm rollback content-studio 3 -n content-studio-dev
```
```

### 11.5 Create Troubleshooting Document

Create `infrastructure/docs/TROUBLESHOOTING.md`:

```markdown
# Troubleshooting Guide

Common issues and solutions for Content Studio deployment.

## Pod Issues

### Pods stuck in Pending

**Symptoms**: Pods remain in `Pending` state

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n content-studio-dev
```

**Common causes**:
1. **Insufficient resources**: Reduce resource requests in values
2. **Node selector mismatch**: Check nodeSelector in deployment
3. **PVC not bound**: Check PersistentVolumeClaim status

### Pods in CrashLoopBackOff

**Symptoms**: Pods repeatedly crash

**Diagnosis**:
```bash
kubectl logs <pod-name> -n content-studio-dev --previous
```

**Common causes**:
1. **Missing environment variables**: Check ConfigMap and Secrets
2. **Database connection failed**: Verify postgres URL
3. **Invalid configuration**: Check env.ts validation errors

### Pods failing health checks

**Symptoms**: Pods restart repeatedly, readiness probe failing

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n content-studio-dev | grep -A 10 "Liveness\|Readiness"
```

**Solutions**:
1. Increase `initialDelaySeconds` for slow startup
2. Check `/healthcheck` endpoint manually
3. Verify port configuration matches

## Ingress Issues

### ALB not created

**Symptoms**: No load balancer appears after deploy

**Diagnosis**:
```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

**Common causes**:
1. **Controller not installed**: Install aws-load-balancer-controller
2. **Missing IAM permissions**: Check service account role
3. **Invalid annotations**: Verify ingress annotations

### 502 Bad Gateway

**Symptoms**: ALB returns 502 errors

**Diagnosis**:
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn <arn>
```

**Common causes**:
1. **Health check failing**: Verify healthcheck-path annotation
2. **Port mismatch**: Ensure service port matches container port
3. **Pods not ready**: Check pod readiness

### SSL Certificate errors

**Symptoms**: HTTPS not working, certificate warnings

**Solutions**:
1. Verify ACM certificate ARN is correct
2. Ensure certificate covers the correct domain
3. Check certificate validation status in ACM console

## Database Issues

### Connection refused

**Symptoms**: `ECONNREFUSED` errors in logs

**Solutions**:
1. Verify `SERVER_POSTGRES_URL` format
2. Check RDS security group allows EKS nodes
3. Ensure database is publicly accessible (or in same VPC)

### Authentication failed

**Symptoms**: `password authentication failed`

**Solutions**:
1. Verify credentials in secret
2. Check for special characters that need encoding
3. Ensure database user exists with correct permissions

## SSE Issues

### Events not received

**Symptoms**: Frontend doesn't receive real-time updates

**Diagnosis**:
```bash
# Check SSE endpoint
curl -N https://your-domain.com/api/events

# Check Redis connectivity
kubectl exec -it <server-pod> -n content-studio-dev -- sh
nc -zv redis-master 6379
```

**Solutions**:
1. Verify `SSE_ADAPTER=redis` and `REDIS_URL` set
2. Check Redis pod is running
3. Ensure ALB has sticky sessions enabled

### Events work for first user only

**Symptoms**: Only one user receives events

**Cause**: Memory adapter used with multiple replicas

**Solution**: Configure Redis adapter for SSE

## Worker Issues

### Jobs not processing

**Symptoms**: Jobs stay in `pending` state

**Diagnosis**:
```bash
kubectl logs -l app.kubernetes.io/component=worker -n content-studio-dev
```

**Common causes**:
1. **Worker not running**: Check worker pod status
2. **Database connection**: Verify postgres URL
3. **AI API errors**: Check Gemini API key and quotas

### Jobs timing out

**Symptoms**: Jobs fail with timeout errors

**Solutions**:
1. Increase worker resource limits
2. Check Gemini API rate limits
3. Monitor worker CPU usage

## HPA Issues

### HPA not scaling

**Symptoms**: Pods don't scale despite high load

**Diagnosis**:
```bash
kubectl describe hpa content-studio-server -n content-studio-dev
kubectl top pods -n content-studio-dev
```

**Common causes**:
1. **Metrics server not installed**: Install metrics-server
2. **No resource requests**: HPA requires CPU/memory requests
3. **Already at max**: Check maxReplicas setting

## Debugging Commands

```bash
# Get all resources
kubectl get all -n content-studio-dev

# Describe deployment
kubectl describe deployment content-studio-server -n content-studio-dev

# Get events
kubectl get events -n content-studio-dev --sort-by='.lastTimestamp'

# Exec into pod
kubectl exec -it <pod-name> -n content-studio-dev -- sh

# Port forward for debugging
kubectl port-forward svc/content-studio-server 3035:3035 -n content-studio-dev

# Check Helm release
helm status content-studio -n content-studio-dev
helm get values content-studio -n content-studio-dev
```
```

## Verification Log

<!-- Agent writes verification results here -->
