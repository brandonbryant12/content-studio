#!/usr/bin/env bash
#
# Setup script for Content Studio local Kind cluster
# Creates a Kind cluster with nginx ingress and deploys the application
#

set -euo pipefail

# Configuration
CLUSTER_NAME="content-studio"
NAMESPACE="content-studio"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELM_CHART_DIR="${SCRIPT_DIR}/../helm/content-studio"
KIND_CONFIG="${SCRIPT_DIR}/kind-config.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required tools
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_tools=()

    if ! command -v kind &> /dev/null; then
        missing_tools+=("kind")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    log_success "All prerequisites satisfied"
}

# Create the Kind cluster
create_cluster() {
    log_info "Creating Kind cluster '${CLUSTER_NAME}'..."

    # Check if cluster already exists
    if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
        log_warning "Cluster '${CLUSTER_NAME}' already exists"
        read -p "Do you want to delete and recreate it? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deleting existing cluster..."
            kind delete cluster --name "${CLUSTER_NAME}"
        else
            log_info "Using existing cluster"
            return 0
        fi
    fi

    kind create cluster --config "${KIND_CONFIG}"
    log_success "Kind cluster created successfully"
}

# Install nginx ingress controller
install_ingress() {
    log_info "Installing nginx ingress controller..."

    # Apply the nginx ingress controller manifest for Kind
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

    log_info "Waiting for ingress controller to be ready..."

    # Wait for the ingress controller pod to be ready
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=120s

    log_success "Nginx ingress controller is ready"
}

# Load local Docker images into Kind
load_images() {
    log_info "Loading local Docker images into Kind cluster..."

    local images_loaded=0

    # Check and load server image
    if docker image inspect content-studio-server:local &> /dev/null; then
        log_info "Loading content-studio-server:local..."
        kind load docker-image content-studio-server:local --name "${CLUSTER_NAME}"
        ((images_loaded++))
    else
        log_warning "Image 'content-studio-server:local' not found locally"
    fi

    # Check and load web image
    if docker image inspect content-studio-web:local &> /dev/null; then
        log_info "Loading content-studio-web:local..."
        kind load docker-image content-studio-web:local --name "${CLUSTER_NAME}"
        ((images_loaded++))
    else
        log_warning "Image 'content-studio-web:local' not found locally"
    fi

    if [ ${images_loaded} -eq 0 ]; then
        log_warning "No local images were loaded. Make sure to build your Docker images first:"
        echo "  docker build -t content-studio-server:local -f apps/server/Dockerfile ."
        echo "  docker build -t content-studio-web:local -f apps/web/Dockerfile ."
    else
        log_success "Loaded ${images_loaded} image(s) into Kind cluster"
    fi
}

# Create the namespace
create_namespace() {
    log_info "Creating namespace '${NAMESPACE}'..."

    if kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_info "Namespace '${NAMESPACE}' already exists"
    else
        kubectl create namespace "${NAMESPACE}"
        log_success "Namespace created"
    fi
}

# Update Helm dependencies
update_helm_deps() {
    log_info "Updating Helm chart dependencies..."

    helm dependency update "${HELM_CHART_DIR}"

    log_success "Helm dependencies updated"
}

# Install the Helm chart
install_helm_chart() {
    log_info "Installing Content Studio Helm chart..."

    # Check if release already exists
    if helm status content-studio --namespace "${NAMESPACE}" &> /dev/null; then
        log_info "Helm release 'content-studio' already exists, upgrading..."
        helm upgrade content-studio "${HELM_CHART_DIR}" \
            --namespace "${NAMESPACE}" \
            --values "${HELM_CHART_DIR}/values-local.yaml" \
            --wait \
            --timeout 5m
    else
        helm install content-studio "${HELM_CHART_DIR}" \
            --namespace "${NAMESPACE}" \
            --values "${HELM_CHART_DIR}/values-local.yaml" \
            --wait \
            --timeout 5m
    fi

    log_success "Helm chart installed successfully"
}

# Print access information
print_access_info() {
    echo ""
    echo "=============================================="
    echo -e "${GREEN}Content Studio Local Environment Ready!${NC}"
    echo "=============================================="
    echo ""
    echo "Access URLs:"
    echo -e "  ${BLUE}Web Application:${NC}  http://localhost/"
    echo -e "  ${BLUE}API Server:${NC}       http://localhost/api"
    echo ""
    echo "Useful commands:"
    echo "  kubectl get pods -n ${NAMESPACE}          # List pods"
    echo "  kubectl logs -f -n ${NAMESPACE} <pod>     # View logs"
    echo "  kubectl get ingress -n ${NAMESPACE}       # View ingress"
    echo ""
    echo "To load new images after rebuilding:"
    echo "  kind load docker-image content-studio-server:local --name ${CLUSTER_NAME}"
    echo "  kind load docker-image content-studio-web:local --name ${CLUSTER_NAME}"
    echo "  kubectl rollout restart deployment -n ${NAMESPACE}"
    echo ""
    echo "To tear down the environment:"
    echo "  ${SCRIPT_DIR}/teardown.sh"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "=============================================="
    echo "Content Studio Kind Local Setup"
    echo "=============================================="
    echo ""

    check_prerequisites
    create_cluster
    install_ingress
    load_images
    create_namespace
    update_helm_deps
    install_helm_chart
    print_access_info
}

main "$@"
