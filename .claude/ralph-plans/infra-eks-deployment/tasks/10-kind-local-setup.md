# Task 10: Create Kind Local Testing Setup

## Standards Checklist

Before starting implementation, read and understand:
- [ ] Kind documentation: https://kind.sigs.k8s.io/
- [ ] Helm chart from Task 04-05

## Context

Create a local Kubernetes testing environment using Kind (Kubernetes in Docker) that mimics the EKS deployment. This allows developers to:
- Test Helm charts before deploying to EKS
- Validate Kubernetes manifests
- Debug deployment issues locally
- Run integration tests against K8s

## Key Files

- `infrastructure/kind/kind-config.yaml` - Kind cluster configuration
- `infrastructure/kind/setup.sh` - Cluster creation script
- `infrastructure/kind/teardown.sh` - Cleanup script
- `infrastructure/kind/README.md` - Usage documentation

## Implementation Steps

### 10.1 Create Kind Configuration

Create `infrastructure/kind/kind-config.yaml`:

```yaml
# Kind cluster configuration that mimics EKS
# Creates a cluster with ingress support and port mappings

kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: content-studio

# Use a specific Kubernetes version (match your EKS version)
# Find available images: https://github.com/kubernetes-sigs/kind/releases
nodes:
  - role: control-plane
    image: kindest/node:v1.29.2
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      # HTTP - maps localhost:80 to ingress controller
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      # HTTPS - maps localhost:443 to ingress controller
      - containerPort: 443
        hostPort: 443
        protocol: TCP
      # NodePort range for direct service access
      - containerPort: 30080
        hostPort: 30080
        protocol: TCP
      - containerPort: 30443
        hostPort: 30443
        protocol: TCP

  # Optional: Add worker nodes for more realistic testing
  # - role: worker
  #   image: kindest/node:v1.29.2
  # - role: worker
  #   image: kindest/node:v1.29.2

# Networking configuration
networking:
  # Use default CNI
  disableDefaultCNI: false
  # Pod subnet (default)
  podSubnet: "10.244.0.0/16"
  # Service subnet (default)
  serviceSubnet: "10.96.0.0/12"

# Container registry configuration (for local images)
containerdConfigPatches:
  - |-
    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = "/etc/containerd/certs.d"
```

### 10.2 Create Setup Script

Create `infrastructure/kind/setup.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo -e "${GREEN}=== Content Studio Local Kubernetes Setup ===${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}Checking prerequisites...${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi

    if ! command -v kind &> /dev/null; then
        echo -e "${RED}Error: Kind is not installed${NC}"
        echo "Install with: brew install kind"
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}Error: kubectl is not installed${NC}"
        echo "Install with: brew install kubectl"
        exit 1
    fi

    if ! command -v helm &> /dev/null; then
        echo -e "${RED}Error: Helm is not installed${NC}"
        echo "Install with: brew install helm"
        exit 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker is not running${NC}"
        exit 1
    fi

    echo -e "${GREEN}All prerequisites met!${NC}"
}

# Create Kind cluster
create_cluster() {
    echo -e "\n${YELLOW}Creating Kind cluster...${NC}"

    # Check if cluster already exists
    if kind get clusters | grep -q "content-studio"; then
        echo -e "${YELLOW}Cluster 'content-studio' already exists. Deleting...${NC}"
        kind delete cluster --name content-studio
    fi

    # Create cluster with configuration
    kind create cluster --config "${SCRIPT_DIR}/kind-config.yaml"

    # Verify cluster is running
    kubectl cluster-info --context kind-content-studio

    echo -e "${GREEN}Kind cluster created successfully!${NC}"
}

# Install Nginx Ingress Controller
install_ingress() {
    echo -e "\n${YELLOW}Installing Nginx Ingress Controller...${NC}"

    # Apply Nginx ingress for Kind
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

    # Wait for ingress controller to be ready
    echo "Waiting for ingress controller to be ready..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=120s

    echo -e "${GREEN}Ingress controller installed!${NC}"
}

# Install metrics server (for HPA)
install_metrics_server() {
    echo -e "\n${YELLOW}Installing Metrics Server...${NC}"

    # Apply metrics server with modifications for Kind
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

    # Patch metrics server to work with Kind (disable TLS verification)
    kubectl patch deployment metrics-server -n kube-system --type='json' -p='[
        {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"},
        {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-preferred-address-types=InternalIP"}
    ]'

    echo -e "${GREEN}Metrics server installed!${NC}"
}

# Build and load Docker images
build_and_load_images() {
    echo -e "\n${YELLOW}Building Docker images...${NC}"

    cd "${PROJECT_ROOT}"

    # Build server image
    echo "Building server image..."
    docker build -t content-studio-server:local -f apps/server/Dockerfile .

    # Build web image with local configuration
    echo "Building web image..."
    docker build \
        --build-arg PUBLIC_SERVER_URL=http://localhost:3035 \
        --build-arg PUBLIC_SERVER_API_PATH=/api \
        -t content-studio-web:local \
        -f apps/web/Dockerfile .

    # Load images into Kind cluster
    echo -e "\n${YELLOW}Loading images into Kind cluster...${NC}"
    kind load docker-image content-studio-server:local --name content-studio
    kind load docker-image content-studio-web:local --name content-studio

    echo -e "${GREEN}Images built and loaded!${NC}"
}

# Create namespace and secrets
setup_namespace() {
    echo -e "\n${YELLOW}Setting up namespace and secrets...${NC}"

    # Create namespace
    kubectl create namespace content-studio-local --dry-run=client -o yaml | kubectl apply -f -

    # Create secrets for local development
    kubectl create secret generic content-studio-local-secrets \
        --namespace content-studio-local \
        --from-literal=SERVER_AUTH_SECRET=local-dev-secret-change-in-production \
        --from-literal=SERVER_POSTGRES_URL=postgres://postgres:postgres@host.docker.internal:5432/content_studio \
        --from-literal=GEMINI_API_KEY=fake-api-key-for-local-testing \
        --dry-run=client -o yaml | kubectl apply -f -

    echo -e "${GREEN}Namespace and secrets created!${NC}"
}

# Deploy with Helm
deploy_helm() {
    echo -e "\n${YELLOW}Deploying Content Studio with Helm...${NC}"

    # Add Bitnami repo for Redis
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update

    # Install/upgrade the release
    helm upgrade --install content-studio \
        "${PROJECT_ROOT}/infrastructure/helm/content-studio" \
        -f "${PROJECT_ROOT}/infrastructure/helm/content-studio/values-local.yaml" \
        -n content-studio-local \
        --wait \
        --timeout 5m

    echo -e "${GREEN}Helm deployment complete!${NC}"
}

# Print access information
print_access_info() {
    echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
    echo -e "\n${YELLOW}Access Information:${NC}"
    echo "  Frontend: http://localhost"
    echo "  API:      http://localhost/api"
    echo "  Health:   http://localhost/healthcheck"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  kubectl get pods -n content-studio-local"
    echo "  kubectl logs -f deployment/content-studio-server -n content-studio-local"
    echo "  kubectl logs -f deployment/content-studio-worker -n content-studio-local"
    echo "  kubectl logs -f deployment/content-studio-web -n content-studio-local"
    echo ""
    echo -e "${YELLOW}To tear down:${NC}"
    echo "  ./infrastructure/kind/teardown.sh"
    echo ""
    echo -e "${YELLOW}Note:${NC} Make sure PostgreSQL is running locally (docker-compose up -d db)"
}

# Main execution
main() {
    check_prerequisites
    create_cluster
    install_ingress
    install_metrics_server
    build_and_load_images
    setup_namespace
    deploy_helm
    print_access_info
}

main "$@"
```

### 10.3 Create Teardown Script

Create `infrastructure/kind/teardown.sh`:

```bash
#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}=== Tearing down Content Studio Kind cluster ===${NC}"

# Delete Kind cluster
if kind get clusters | grep -q "content-studio"; then
    echo "Deleting Kind cluster 'content-studio'..."
    kind delete cluster --name content-studio
    echo -e "${GREEN}Cluster deleted successfully!${NC}"
else
    echo "Cluster 'content-studio' does not exist."
fi

# Optionally clean up Docker images
read -p "Remove local Docker images? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing Docker images..."
    docker rmi content-studio-server:local 2>/dev/null || true
    docker rmi content-studio-web:local 2>/dev/null || true
    echo -e "${GREEN}Images removed!${NC}"
fi

echo -e "\n${GREEN}Teardown complete!${NC}"
```

### 10.4 Create README

Create `infrastructure/kind/README.md`:

```markdown
# Local Kubernetes Testing with Kind

This directory contains scripts for running Content Studio in a local Kubernetes cluster using [Kind](https://kind.sigs.k8s.io/).

## Prerequisites

Install the required tools:

```bash
# macOS
brew install kind kubectl helm

# Or using Docker
# Kind and kubectl can also run via Docker
```

Ensure Docker Desktop is running with at least:
- 4 CPU cores
- 8GB RAM
- 20GB disk space

## Quick Start

### 1. Start the local database

```bash
# From project root
docker-compose up -d db
```

### 2. Create the Kind cluster and deploy

```bash
./infrastructure/kind/setup.sh
```

This script will:
1. Create a Kind cluster named `content-studio`
2. Install Nginx Ingress Controller
3. Install Metrics Server (for HPA)
4. Build Docker images locally
5. Load images into the Kind cluster
6. Deploy using Helm with local values

### 3. Access the application

- **Frontend**: http://localhost
- **API**: http://localhost/api
- **Health Check**: http://localhost/healthcheck

### 4. Tear down

```bash
./infrastructure/kind/teardown.sh
```

## Manual Operations

### Rebuild and redeploy

```bash
# Rebuild images
docker build -t content-studio-server:local -f apps/server/Dockerfile .
docker build -t content-studio-web:local -f apps/web/Dockerfile .

# Load into Kind
kind load docker-image content-studio-server:local --name content-studio
kind load docker-image content-studio-web:local --name content-studio

# Restart deployments to pick up new images
kubectl rollout restart deployment -n content-studio-local
```

### Check pod status

```bash
kubectl get pods -n content-studio-local
```

### View logs

```bash
# Server logs
kubectl logs -f deployment/content-studio-server -n content-studio-local

# Worker logs
kubectl logs -f deployment/content-studio-worker -n content-studio-local

# Web logs
kubectl logs -f deployment/content-studio-web -n content-studio-local
```

### Scale deployments

```bash
kubectl scale deployment content-studio-server --replicas=3 -n content-studio-local
```

### Port forward directly to a service

```bash
# Forward server port
kubectl port-forward svc/content-studio-server 3035:3035 -n content-studio-local

# Forward web port
kubectl port-forward svc/content-studio-web 8085:80 -n content-studio-local
```

## Differences from EKS

| Feature | Kind (Local) | EKS (Production) |
|---------|-------------|------------------|
| Ingress | Nginx | AWS ALB |
| SSL/TLS | Not configured | ACM Certificate |
| Secrets | Kubernetes Secrets | AWS Secrets Manager |
| Storage | Local/Database | S3 |
| Database | External (docker-compose) | RDS |
| SSE | Memory adapter | Redis |

## Troubleshooting

### Cluster won't start
- Ensure Docker has enough resources
- Try: `docker system prune -a`

### Images not loading
- Verify images exist: `docker images | grep content-studio`
- Check Kind cluster: `kubectl get nodes`

### Pods stuck in Pending
- Check events: `kubectl describe pod <pod-name> -n content-studio-local`
- Verify resource limits aren't too high for local machine

### Can't access localhost
- Verify ingress is running: `kubectl get pods -n ingress-nginx`
- Check ingress rules: `kubectl get ingress -n content-studio-local`
- Ensure ports 80/443 aren't in use

### Database connection fails
- Verify PostgreSQL is running: `docker-compose ps`
- Check connection string uses `host.docker.internal`
```

### 10.5 Make Scripts Executable

```bash
chmod +x infrastructure/kind/setup.sh
chmod +x infrastructure/kind/teardown.sh
```

## Verification Log

<!-- Agent writes verification results here -->
