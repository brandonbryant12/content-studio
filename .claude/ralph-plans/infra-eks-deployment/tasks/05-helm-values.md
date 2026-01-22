# Task 05: Create Helm Values for Each Environment

## Standards Checklist

Before starting implementation, read and understand:
- [ ] Task 04 completion (chart structure must exist)

## Context

Create environment-specific values files for the Helm chart. Each environment has different requirements:

| Environment | Purpose | Replicas | Resources | Storage |
|-------------|---------|----------|-----------|---------|
| Local | Kind cluster testing | 1 each | Minimal | Mock/local |
| Dev | Development/testing on EKS | 1-2 | Low | S3 |
| Staging | Pre-production validation | 2-3 | Medium | S3 |
| Prod | Production | 3+ | High | S3 |

## Key Files

- `infrastructure/helm/content-studio/values.yaml` - Base defaults
- `infrastructure/helm/content-studio/values-local.yaml` - Kind cluster
- `infrastructure/helm/content-studio/values-dev.yaml` - EKS dev
- `infrastructure/helm/content-studio/values-staging.yaml` - EKS staging
- `infrastructure/helm/content-studio/values-prod.yaml` - EKS production

## Implementation Steps

### 5.1 Create Base values.yaml

Create `infrastructure/helm/content-studio/values.yaml`:

```yaml
# Content Studio Helm Chart Values
# This file contains default values and documentation for all configurable options.
# Override these values using environment-specific files (values-dev.yaml, etc.)

# -- Environment name (dev, staging, prod)
environment: dev

# -- Namespace configuration
namespace:
  # -- Create namespace if it doesn't exist
  create: true
  # -- Namespace name (defaults to content-studio-{environment})
  name: ""

# -- Public URLs (REQUIRED - must override per environment)
# @default -- Must be set
publicServerUrl: ""
# @default -- Must be set
publicWebUrl: ""
# -- API path prefix
publicServerApiPath: "/api"

# -- Use mock AI services (set to false for production)
useMockAI: false

# =============================================================================
# Server Configuration
# =============================================================================
server:
  # -- Number of server replicas
  replicas: 2

  # -- Server port
  port: 3035

  image:
    # -- Server image repository
    repository: your-ecr-repo/content-studio-server
    # -- Image pull policy
    pullPolicy: IfNotPresent
    # -- Image tag (defaults to Chart.appVersion)
    tag: ""

  service:
    # -- Service type
    type: ClusterIP
    # -- Service port
    port: 3035

  # -- Resource requests and limits
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

  # -- Node selector for server pods
  nodeSelector: {}

  # -- HPA configuration
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

# =============================================================================
# Worker Configuration
# =============================================================================
worker:
  # -- Number of worker replicas
  replicas: 2

  # -- Resource requests and limits
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi

  # -- Node selector for worker pods
  nodeSelector: {}

  # -- HPA configuration
  autoscaling:
    enabled: true
    minReplicas: 1
    maxReplicas: 5
    targetCPUUtilizationPercentage: 80

# =============================================================================
# Web (Frontend) Configuration
# =============================================================================
web:
  # -- Number of web replicas
  replicas: 2

  image:
    # -- Web image repository
    repository: your-ecr-repo/content-studio-web
    # -- Image pull policy
    pullPolicy: IfNotPresent
    # -- Image tag (defaults to Chart.appVersion)
    tag: ""

  service:
    # -- Service type
    type: ClusterIP
    # -- Service port
    port: 80

  # -- Resource requests and limits
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi

  # -- HPA configuration
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# =============================================================================
# Ingress Configuration (AWS ALB)
# =============================================================================
ingress:
  # -- Enable ingress
  enabled: true

  # -- Ingress class name
  className: alb

  # -- Ingress annotations for AWS ALB
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    # -- SSL certificate ARN (REQUIRED for HTTPS)
    alb.ingress.kubernetes.io/certificate-arn: ""
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    # -- Health check configuration
    alb.ingress.kubernetes.io/healthcheck-path: /healthcheck
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: "30"
    # -- Sticky sessions for SSE (fallback if Redis unavailable)
    alb.ingress.kubernetes.io/target-group-attributes: stickiness.enabled=true,stickiness.lb_cookie.duration_seconds=86400

  # -- Hostname for the ingress
  host: ""

# =============================================================================
# Storage Configuration
# =============================================================================
storage:
  # -- Storage provider: database, filesystem, or s3
  provider: s3

  s3:
    # -- S3 bucket name
    bucket: ""
    # -- S3 region
    region: us-east-1
    # -- Custom S3 endpoint (for R2, MinIO, etc.)
    endpoint: ""

# =============================================================================
# SSE (Server-Sent Events) Configuration
# =============================================================================
sse:
  # -- SSE adapter: memory or redis
  adapter: redis

# =============================================================================
# Redis Configuration (Bitnami subchart)
# =============================================================================
redis:
  # -- Enable Redis subchart
  enabled: true

  # -- Redis architecture: standalone or replication
  architecture: standalone

  auth:
    # -- Disable Redis auth for simplicity (enable in production)
    enabled: false

  master:
    persistence:
      # -- Enable persistence
      enabled: false
    resources:
      requests:
        cpu: 100m
        memory: 128Mi

# -- External Redis configuration (if redis.enabled is false)
externalRedis:
  url: ""

# =============================================================================
# Secrets Configuration
# =============================================================================
secrets:
  # -- Create secrets from values (set to false if using external secrets)
  create: true

  # -- Use existing secret name instead of creating one
  existingSecret: ""

  # -- Auth secret (REQUIRED)
  authSecret: ""

  # -- PostgreSQL connection URL (REQUIRED)
  postgresUrl: ""

  # -- Gemini API key (REQUIRED)
  geminiApiKey: ""

  # -- S3 credentials (required if storage.provider is s3)
  s3AccessKeyId: ""
  s3SecretAccessKey: ""

  # -- Datadog API key (required if observability.datadog.enabled)
  datadogApiKey: ""

# =============================================================================
# Observability Configuration
# =============================================================================
observability:
  # -- OTLP endpoint for traces/metrics
  otlpEndpoint: "http://localhost:4318"

  datadog:
    # -- Enable Datadog agent
    enabled: true

    # -- Datadog agent image
    image: gcr.io/datadoghq/agent:latest

    # -- Enable APM
    apmEnabled: true

    # -- Enable logs collection
    logsEnabled: true

# =============================================================================
# Service Account Configuration
# =============================================================================
serviceAccount:
  # -- Create service account
  create: true
  # -- Service account name
  name: ""
  # -- Annotations for the service account (e.g., for IAM roles)
  annotations: {}

# =============================================================================
# Image Pull Secrets
# =============================================================================
imagePullSecrets: []
```

### 5.2 Create values-local.yaml (Kind Cluster)

Create `infrastructure/helm/content-studio/values-local.yaml`:

```yaml
# Local Kind Cluster Configuration
# Use with: helm install content-studio ./infrastructure/helm/content-studio -f ./infrastructure/helm/content-studio/values-local.yaml

environment: local

namespace:
  create: true
  name: content-studio-local

# Local URLs
publicServerUrl: "http://localhost:3035"
publicWebUrl: "http://localhost:8085"
publicServerApiPath: "/api"

# Use mock AI for local testing
useMockAI: true

server:
  replicas: 1
  image:
    repository: content-studio-server
    tag: local
    pullPolicy: Never  # Use locally loaded images
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: false

worker:
  replicas: 1
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: false

web:
  replicas: 1
  image:
    repository: content-studio-web
    tag: local
    pullPolicy: Never
  service:
    type: NodePort
    port: 80
    nodePort: 30080
  resources:
    requests:
      cpu: 25m
      memory: 32Mi
    limits:
      cpu: 100m
      memory: 64Mi
  autoscaling:
    enabled: false

# Use nginx ingress for local (not ALB)
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
  host: localhost

# Local storage (database or filesystem)
storage:
  provider: database

# SSE with memory adapter (single replica)
sse:
  adapter: memory

# Disable Redis for local (using memory adapter)
redis:
  enabled: false

# Local secrets (for testing only - never commit real secrets!)
secrets:
  create: true
  authSecret: "local-dev-secret-change-in-production"
  postgresUrl: "postgres://postgres:postgres@host.docker.internal:5432/content_studio"
  geminiApiKey: "fake-api-key-for-local-testing"

# Disable Datadog for local
observability:
  datadog:
    enabled: false
```

### 5.3 Create values-dev.yaml (EKS Dev)

Create `infrastructure/helm/content-studio/values-dev.yaml`:

```yaml
# EKS Development Environment Configuration
# Use with: helm upgrade --install content-studio ./infrastructure/helm/content-studio -f ./infrastructure/helm/content-studio/values-dev.yaml -n content-studio-dev

environment: dev

namespace:
  create: true
  name: content-studio-dev

# Dev environment URLs (update with your actual URLs)
publicServerUrl: "https://api-dev.content-studio.example.com"
publicWebUrl: "https://dev.content-studio.example.com"

useMockAI: false  # Use real AI in dev for testing

server:
  replicas: 1
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-server
    tag: dev
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 500m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 1
    maxReplicas: 3
    targetCPUUtilizationPercentage: 80

worker:
  replicas: 1
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 1
    maxReplicas: 2

web:
  replicas: 1
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-web
    tag: dev
  autoscaling:
    enabled: true
    minReplicas: 1
    maxReplicas: 3

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789012:certificate/dev-cert-id"
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
  host: dev.content-studio.example.com

storage:
  provider: s3
  s3:
    bucket: content-studio-dev-storage
    region: us-east-1

redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: false
  master:
    persistence:
      enabled: false

# Use existing secret created by DevOps
secrets:
  create: false
  existingSecret: content-studio-dev-secrets

observability:
  otlpEndpoint: "http://datadog-agent:4318"
  datadog:
    enabled: true
```

### 5.4 Create values-staging.yaml (EKS Staging)

Create `infrastructure/helm/content-studio/values-staging.yaml`:

```yaml
# EKS Staging Environment Configuration
# Use with: helm upgrade --install content-studio ./infrastructure/helm/content-studio -f ./infrastructure/helm/content-studio/values-staging.yaml -n content-studio-staging

environment: staging

namespace:
  create: true
  name: content-studio-staging

publicServerUrl: "https://api-staging.content-studio.example.com"
publicWebUrl: "https://staging.content-studio.example.com"

useMockAI: false

server:
  replicas: 2
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-server
    tag: staging
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

worker:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 4

web:
  replicas: 2
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-web
    tag: staging
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789012:certificate/staging-cert-id"
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
  host: staging.content-studio.example.com

storage:
  provider: s3
  s3:
    bucket: content-studio-staging-storage
    region: us-east-1

redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: true
  master:
    persistence:
      enabled: true
      size: 1Gi

secrets:
  create: false
  existingSecret: content-studio-staging-secrets

observability:
  otlpEndpoint: "http://datadog-agent:4318"
  datadog:
    enabled: true
```

### 5.5 Create values-prod.yaml (EKS Production)

Create `infrastructure/helm/content-studio/values-prod.yaml`:

```yaml
# EKS Production Environment Configuration
# Use with: helm upgrade --install content-studio ./infrastructure/helm/content-studio -f ./infrastructure/helm/content-studio/values-prod.yaml -n content-studio-prod

environment: prod

namespace:
  create: true
  name: content-studio-prod

publicServerUrl: "https://api.content-studio.example.com"
publicWebUrl: "https://content-studio.example.com"

useMockAI: false

server:
  replicas: 3
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-server
    tag: ""  # Will use Chart.appVersion
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 60
    targetMemoryUtilizationPercentage: 70

worker:
  replicas: 3
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 4Gi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

web:
  replicas: 3
  image:
    repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/content-studio-web
    tag: ""  # Will use Chart.appVersion
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 60

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789012:certificate/prod-cert-id"
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    # Production-specific settings
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=300
    alb.ingress.kubernetes.io/target-group-attributes: deregistration_delay.timeout_seconds=30
  host: content-studio.example.com

storage:
  provider: s3
  s3:
    bucket: content-studio-prod-storage
    region: us-east-1

redis:
  enabled: true
  architecture: replication  # HA Redis for production
  auth:
    enabled: true
  master:
    persistence:
      enabled: true
      size: 5Gi
  replica:
    replicaCount: 2
    persistence:
      enabled: true
      size: 5Gi

secrets:
  create: false
  existingSecret: content-studio-prod-secrets

observability:
  otlpEndpoint: "http://datadog-agent:4318"
  datadog:
    enabled: true

# Production service account with IAM role
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/content-studio-prod-role"
```

## Verification Log

<!-- Agent writes verification results here -->
