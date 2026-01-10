# Content Studio Infrastructure

Kubernetes infrastructure for Content Studio, an AI-powered podcast generation platform.

## Overview

This repository contains Helm charts and local development tooling for deploying Content Studio to Kubernetes clusters (EKS in production, Kind for local development).

## Directory Structure

```
infrastructure/
├── helm/
│   └── content-studio/       # Main Helm chart
│       ├── templates/        # Kubernetes manifests
│       ├── values.yaml       # Default values
│       ├── values-local.yaml # Local/Kind values
│       ├── values-dev.yaml   # Development environment
│       ├── values-staging.yaml
│       └── values-prod.yaml
├── kind/
│   ├── kind-config.yaml      # Kind cluster configuration
│   ├── setup.sh              # Create local cluster
│   └── teardown.sh           # Delete local cluster
└── docs/
    └── ARCHITECTURE.md       # System architecture details
```

## Prerequisites

- **Docker** - Container runtime
- **kubectl** - Kubernetes CLI
- **Helm** (v3+) - Kubernetes package manager
- **Kind** - For local development clusters

### Install Prerequisites (macOS)

```bash
brew install kubectl helm kind
```

## Quick Start (Local Development)

### 1. Build Docker Images

From the monorepo root:

```bash
docker build -t content-studio-server:local -f apps/server/Dockerfile .
docker build -t content-studio-web:local -f apps/web/Dockerfile .
```

### 2. Create Local Cluster

```bash
cd infrastructure/kind
./setup.sh
```

This script will:
- Create a Kind cluster with ingress support
- Install nginx ingress controller
- Load local Docker images
- Deploy the application via Helm

### 3. Access the Application

- **Web UI**: http://localhost/
- **API**: http://localhost/api

### 4. Teardown

```bash
./teardown.sh
```

## Common Commands

### View Pods and Logs

```bash
# List all pods
kubectl get pods -n content-studio

# View server logs
kubectl logs -f -n content-studio -l app.kubernetes.io/component=server

# View worker logs
kubectl logs -f -n content-studio -l app.kubernetes.io/component=worker
```

### Reload After Code Changes

```bash
# Rebuild images
docker build -t content-studio-server:local -f apps/server/Dockerfile .
docker build -t content-studio-web:local -f apps/web/Dockerfile .

# Load into Kind
kind load docker-image content-studio-server:local --name content-studio
kind load docker-image content-studio-web:local --name content-studio

# Restart deployments
kubectl rollout restart deployment -n content-studio
```

### Helm Operations

```bash
# Upgrade release
helm upgrade content-studio helm/content-studio \
  -n content-studio \
  -f helm/content-studio/values-local.yaml

# View rendered templates
helm template content-studio helm/content-studio \
  -f helm/content-studio/values-local.yaml

# Check release status
helm status content-studio -n content-studio
```

## Deployment Environments

| Environment | Values File | Ingress Class | Notes |
|-------------|-------------|---------------|-------|
| Local | `values-local.yaml` | nginx | Kind cluster, mock AI |
| Dev | `values-dev.yaml` | alb | AWS EKS, shared infra |
| Staging | `values-staging.yaml` | alb | AWS EKS, production-like |
| Prod | `values-prod.yaml` | alb | AWS EKS, HA configuration |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and component details
