# Local Testing Guide

This guide covers two approaches for testing Content Studio locally:
1. **Docker Compose** - Quick testing of containerized deployment
2. **Kind Cluster** - Full Kubernetes environment simulation

---

## Prerequisites

### Required Tools

| Tool | Version | Installation |
|------|---------|--------------|
| Docker | 20.10+ | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | v2+ | Included with Docker Desktop |
| Kind | 0.20+ | `brew install kind` or [kind.sigs.k8s.io](https://kind.sigs.k8s.io/docs/user/quick-start/) |
| kubectl | 1.28+ | `brew install kubectl` or [kubernetes.io](https://kubernetes.io/docs/tasks/tools/) |
| Helm | 3.12+ | `brew install helm` or [helm.sh](https://helm.sh/docs/intro/install/) |

### Verify Prerequisites

```bash
# Check all tools are installed
docker --version
docker compose version
kind --version
kubectl version --client
helm version
```

### Ensure Docker is Running

```bash
docker info
```

---

## Option 1: Docker Compose Testing

Use `compose.k8s-test.yaml` to simulate the Kubernetes deployment locally with separate server and worker containers.

### What It Tests

- Server running in HTTP-only mode (`--mode=server`)
- Worker running in job-processing mode (`--mode=worker`)
- Redis for SSE cross-instance communication
- PostgreSQL for data persistence
- Health checks for all services

### Quick Start

```bash
# From repository root
docker compose -f compose.k8s-test.yaml up --build
```

### Step-by-Step

#### 1. Build and Start Services

```bash
# Build images and start all services
docker compose -f compose.k8s-test.yaml up --build

# Or run in detached mode
docker compose -f compose.k8s-test.yaml up --build -d
```

#### 2. Wait for Services to be Healthy

```bash
# Check service status
docker compose -f compose.k8s-test.yaml ps

# Wait for health checks
docker compose -f compose.k8s-test.yaml up --wait
```

#### 3. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost:8085 | Frontend application |
| API Server | http://localhost:3035 | Backend API |
| Health Check | http://localhost:3035/healthcheck | Server health endpoint |

#### 4. View Logs

```bash
# All services
docker compose -f compose.k8s-test.yaml logs -f

# Specific service
docker compose -f compose.k8s-test.yaml logs -f server
docker compose -f compose.k8s-test.yaml logs -f worker
docker compose -f compose.k8s-test.yaml logs -f web
```

#### 5. Clean Up

```bash
# Stop services
docker compose -f compose.k8s-test.yaml down

# Stop and remove volumes (clears database)
docker compose -f compose.k8s-test.yaml down -v
```

### Environment Variables

Set environment variables before starting:

```bash
# Use real AI (requires API key)
export GEMINI_API_KEY=your-api-key
export USE_MOCK_AI=false

# Start services
docker compose -f compose.k8s-test.yaml up --build
```

Or create a `.env` file:

```bash
# .env file in repository root
SERVER_AUTH_SECRET=my-dev-secret
GEMINI_API_KEY=your-api-key
USE_MOCK_AI=false
```

### Debugging Tips

```bash
# Execute commands in a running container
docker compose -f compose.k8s-test.yaml exec server sh
docker compose -f compose.k8s-test.yaml exec worker sh

# Check container health
docker inspect --format='{{.State.Health.Status}}' content-studio-eks-infra-server-1

# View container resource usage
docker stats

# Restart a specific service
docker compose -f compose.k8s-test.yaml restart server
```

---

## Option 2: Kind Cluster Testing

Use Kind (Kubernetes in Docker) for a full Kubernetes environment that closely mirrors production EKS.

### What It Tests

- Full Kubernetes deployment with Helm
- Ingress controller routing
- Service discovery
- ConfigMaps and Secrets
- Pod scheduling and health checks

### Quick Start

```bash
# From infrastructure/kind directory
cd infrastructure/kind
./setup.sh
```

### Step-by-Step

#### 1. Build Docker Images

Before creating the Kind cluster, build the Docker images locally:

```bash
# From repository root
docker build -t content-studio-server:local -f apps/server/Dockerfile .
docker build -t content-studio-web:local \
  --build-arg PUBLIC_SERVER_URL=http://localhost/api \
  --build-arg PUBLIC_SERVER_API_PATH=/api \
  -f apps/web/Dockerfile .
```

#### 2. Create Kind Cluster

```bash
cd infrastructure/kind
./setup.sh
```

The setup script will:
1. Check prerequisites
2. Create a Kind cluster named `content-studio`
3. Install nginx ingress controller
4. Load local Docker images into the cluster
5. Create the `content-studio` namespace
6. Install the Helm chart with local values

#### 3. Wait for Pods to be Ready

```bash
# Watch pods come up
kubectl get pods -n content-studio -w

# Check all resources
kubectl get all -n content-studio
```

#### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost/ | Frontend via ingress |
| API Server | http://localhost/api | Backend via ingress |
| Health Check | http://localhost/api/healthcheck | Server health |

#### 5. View Logs

```bash
# List pods
kubectl get pods -n content-studio

# Server logs
kubectl logs -f -n content-studio -l app.kubernetes.io/component=server

# Worker logs
kubectl logs -f -n content-studio -l app.kubernetes.io/component=worker

# Web logs
kubectl logs -f -n content-studio -l app.kubernetes.io/component=web

# All pods
kubectl logs -f -n content-studio -l app.kubernetes.io/name=content-studio
```

#### 6. Clean Up

```bash
cd infrastructure/kind
./teardown.sh
```

### Loading Updated Images

After making code changes, rebuild and reload images:

```bash
# Rebuild images
docker build -t content-studio-server:local -f apps/server/Dockerfile .
docker build -t content-studio-web:local \
  --build-arg PUBLIC_SERVER_URL=http://localhost/api \
  --build-arg PUBLIC_SERVER_API_PATH=/api \
  -f apps/web/Dockerfile .

# Load into Kind cluster
kind load docker-image content-studio-server:local --name content-studio
kind load docker-image content-studio-web:local --name content-studio

# Restart deployments to pick up new images
kubectl rollout restart deployment -n content-studio
```

### Helm Chart Updates

To update the Helm release after modifying values:

```bash
# Update dependencies
helm dependency update infrastructure/helm/content-studio

# Upgrade release
helm upgrade content-studio infrastructure/helm/content-studio \
  --namespace content-studio \
  --values infrastructure/helm/content-studio/values-local.yaml
```

### Debugging Tips

```bash
# Describe a pod (shows events, conditions)
kubectl describe pod -n content-studio <pod-name>

# Execute shell in a pod
kubectl exec -it -n content-studio <pod-name> -- sh

# Check ingress configuration
kubectl get ingress -n content-studio
kubectl describe ingress -n content-studio

# View secrets (base64 encoded)
kubectl get secret -n content-studio content-studio-secrets -o yaml

# Check ConfigMap values
kubectl get configmap -n content-studio content-studio-config -o yaml

# Port-forward to a specific pod (bypassing ingress)
kubectl port-forward -n content-studio svc/content-studio-server 3035:3000

# Check resource usage
kubectl top pods -n content-studio

# View events
kubectl get events -n content-studio --sort-by='.lastTimestamp'

# Check HPA status (if enabled)
kubectl get hpa -n content-studio
```

### Troubleshooting

#### Pods Stuck in Pending

```bash
# Check node resources
kubectl describe nodes

# Check pod events
kubectl describe pod -n content-studio <pod-name>
```

#### ImagePullBackOff Error

Images are loaded locally, so check if they exist:

```bash
# List images in Kind node
docker exec -it content-studio-control-plane crictl images

# Reload images
kind load docker-image content-studio-server:local --name content-studio
```

#### Ingress Not Working

```bash
# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Verify ingress configuration
kubectl describe ingress -n content-studio
```

#### Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl get pods -n content-studio -l app.kubernetes.io/name=postgresql

# Check PostgreSQL logs
kubectl logs -n content-studio -l app.kubernetes.io/name=postgresql

# Test database connection from server pod
kubectl exec -it -n content-studio <server-pod> -- sh
# Inside pod:
# wget -qO- postgres://postgres:postgres@content-studio-postgresql:5432/postgres
```

#### Redis Connection Issues

```bash
# Check Redis pod
kubectl get pods -n content-studio -l app.kubernetes.io/name=redis

# Test Redis connection
kubectl exec -it -n content-studio <server-pod> -- sh
# Inside pod:
# nc -zv content-studio-redis-master 6379
```

---

## Comparison: Docker Compose vs Kind

| Aspect | Docker Compose | Kind |
|--------|----------------|------|
| Setup Time | ~1 minute | ~3-5 minutes |
| Resource Usage | Lower | Higher |
| K8s Features | None | Full |
| Ingress | Port mapping | nginx ingress |
| Secrets/ConfigMaps | Environment vars | K8s resources |
| Helm Testing | No | Yes |
| CI/CD Simulation | Partial | Full |

**Recommendation:**
- Use **Docker Compose** for quick iteration and debugging
- Use **Kind** for testing Helm charts and Kubernetes-specific features
