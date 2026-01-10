#!/usr/bin/env bash
#
# Teardown script for Content Studio local Kind cluster
# Cleans up the Kind cluster and all related resources
#

set -euo pipefail

# Configuration
CLUSTER_NAME="content-studio"
NAMESPACE="content-studio"

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

# Uninstall Helm release
uninstall_helm() {
    log_info "Uninstalling Helm release 'content-studio'..."

    # Check if cluster exists first
    if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
        log_warning "Cluster '${CLUSTER_NAME}' does not exist, skipping Helm uninstall"
        return 0
    fi

    # Set kubectl context to the Kind cluster
    kubectl config use-context "kind-${CLUSTER_NAME}" 2>/dev/null || true

    # Check if the release exists
    if helm status content-studio --namespace "${NAMESPACE}" &> /dev/null; then
        helm uninstall content-studio --namespace "${NAMESPACE}"
        log_success "Helm release uninstalled"
    else
        log_info "Helm release 'content-studio' not found, skipping"
    fi
}

# Delete the namespace
delete_namespace() {
    log_info "Deleting namespace '${NAMESPACE}'..."

    # Check if cluster exists
    if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
        log_warning "Cluster '${CLUSTER_NAME}' does not exist, skipping namespace deletion"
        return 0
    fi

    if kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        kubectl delete namespace "${NAMESPACE}" --timeout=60s || {
            log_warning "Namespace deletion timed out, forcing..."
            kubectl delete namespace "${NAMESPACE}" --force --grace-period=0 2>/dev/null || true
        }
        log_success "Namespace deleted"
    else
        log_info "Namespace '${NAMESPACE}' not found, skipping"
    fi
}

# Delete the Kind cluster
delete_cluster() {
    log_info "Deleting Kind cluster '${CLUSTER_NAME}'..."

    if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
        kind delete cluster --name "${CLUSTER_NAME}"
        log_success "Kind cluster deleted"
    else
        log_info "Cluster '${CLUSTER_NAME}' not found, skipping"
    fi
}

# Clean up Docker resources
cleanup_docker() {
    log_info "Cleaning up Docker resources..."

    # Remove any dangling Kind networks
    docker network prune -f 2>/dev/null || true

    # Note: We don't remove the local images as they may be useful for rebuilding
    log_info "Docker cleanup complete (local images preserved)"
}

# Clean up kubectl context
cleanup_kubectl_context() {
    log_info "Cleaning up kubectl context..."

    # Remove the Kind cluster context from kubectl config
    kubectl config delete-context "kind-${CLUSTER_NAME}" 2>/dev/null || true
    kubectl config delete-cluster "kind-${CLUSTER_NAME}" 2>/dev/null || true

    log_info "kubectl context cleanup complete"
}

# Main execution
main() {
    echo ""
    echo "=============================================="
    echo "Content Studio Kind Teardown"
    echo "=============================================="
    echo ""

    # Ask for confirmation
    read -p "This will delete the Kind cluster and all its resources. Continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Teardown cancelled"
        exit 0
    fi

    echo ""

    uninstall_helm
    delete_namespace
    delete_cluster
    cleanup_docker
    cleanup_kubectl_context

    echo ""
    echo "=============================================="
    log_success "Teardown complete!"
    echo "=============================================="
    echo ""
    echo "All Content Studio local resources have been cleaned up."
    echo "To recreate the environment, run: ./setup.sh"
    echo ""
}

main "$@"
