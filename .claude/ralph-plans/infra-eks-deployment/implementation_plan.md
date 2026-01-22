# EKS Deployment Infrastructure Implementation Plan

> **STATUS: NOT_STARTED**

## Overview

Create a production-ready Kubernetes deployment infrastructure for Content Studio that enables smooth handoff to the DevOps team. This includes refactoring the backend to support a unified worker mode, adding Redis pub/sub for SSE scaling, creating Helm charts for EKS deployment, Jenkinsfile templates for CI/CD, OpenTelemetry integration with Datadog, and comprehensive local testing with Kind.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Worker Architecture | Single unified worker handling all job types |
| Container Strategy | Same image, different command (--mode=server vs --mode=worker) |
| Kubernetes Tooling | Helm Charts with environment overlays |
| Ingress | AWS ALB Ingress Controller |
| Secrets Management | Kubernetes Secrets (standard) |
| Storage Backend | S3 (documented configuration) |
| SSE Scaling | Redis Pub/Sub adapter for multi-replica support |
| Auto-scaling | Horizontal Pod Autoscaler (HPA) |
| CI/CD | Jenkins with Jenkinsfile templates |
| Observability | OpenTelemetry → Datadog (with agent sidecar) |
| Environments | Dev + Staging + Prod (namespace-based) |
| Local Testing | Kind cluster mimicking EKS |

## Validation Commands

```bash
# Type check all packages
pnpm typecheck

# Run all tests
pnpm test

# Build all packages
pnpm build

# Build Docker images locally
docker build -t content-studio-server:local -f apps/server/Dockerfile .
docker build -t content-studio-web:local -f apps/web/Dockerfile .

# Validate Helm charts
helm lint ./infrastructure/helm/content-studio

# Test with Kind cluster
kind create cluster --name content-studio-local
helm install content-studio ./infrastructure/helm/content-studio -f ./infrastructure/helm/content-studio/values-local.yaml
```

---

## Issues

<!-- Agent checks this section each pass for user-created issues -->
| Issue | Status | Notes |
|-------|--------|-------|
| _No issues_ | | |

---

## Tasks

### Task 01: Refactor Workers into Unified Worker
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/use-case.md`
**Acceptance Criteria:**
- [ ] Single `unified-worker.ts` that handles podcast, voiceover, and future job types
- [ ] Server supports `--mode=server|worker` CLI flag
- [ ] Worker mode skips HTTP server startup, only runs job processing
- [ ] Existing job processing logic preserved (polling, backoff, error handling)
- [ ] Unit tests verify both modes work correctly
- [ ] `pnpm typecheck && pnpm test` passes
**Details:** [01-unified-worker.md](./tasks/01-unified-worker.md)

---

### Task 02: Add Redis Pub/Sub for SSE Scaling
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/patterns/use-case.md`, `standards/patterns/repository.md`
**Acceptance Criteria:**
- [ ] Redis client package added to dependencies
- [ ] `SSEManager` refactored with pluggable adapter pattern (in-memory vs Redis)
- [ ] Redis adapter publishes events to Redis channel
- [ ] Redis adapter subscribes and broadcasts to local connections
- [ ] Environment variable `SSE_ADAPTER=memory|redis` and `REDIS_URL` added
- [ ] In-memory adapter remains default for local development
- [ ] Integration test verifies cross-instance event delivery
- [ ] `pnpm typecheck && pnpm test` passes
**Details:** [02-redis-sse-adapter.md](./tasks/02-redis-sse-adapter.md)

---

### Task 03: Update Dockerfiles for Multi-Mode Support
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] Server Dockerfile accepts `MODE` build arg (default: server)
- [ ] Entrypoint script supports `--mode=server` and `--mode=worker` flags
- [ ] Health check works for both modes (HTTP for server, process check for worker)
- [ ] Docker build succeeds for both modes
- [ ] Images tested locally with `docker run`
**Details:** [03-dockerfile-multimode.md](./tasks/03-dockerfile-multimode.md)

---

### Task 04: Create Helm Chart Structure
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] Helm chart created at `infrastructure/helm/content-studio/`
- [ ] Chart.yaml with proper metadata and dependencies (redis subchart)
- [ ] Base templates: deployment, service, ingress, hpa, configmap, secrets
- [ ] Separate deployments for: server, worker, web (frontend)
- [ ] `helm lint` passes
- [ ] `helm template` renders valid YAML
**Details:** [04-helm-chart-structure.md](./tasks/04-helm-chart-structure.md)

---

### Task 05: Create Helm Values for Each Environment
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] `values.yaml` - base/default values with documentation comments
- [ ] `values-local.yaml` - Kind cluster testing (NodePort, mock services)
- [ ] `values-dev.yaml` - EKS dev environment
- [ ] `values-staging.yaml` - EKS staging environment
- [ ] `values-prod.yaml` - EKS production environment
- [ ] Each environment has appropriate resource limits, replica counts, and URLs
- [ ] S3 storage configuration documented in values
- [ ] All required environment variables documented with descriptions
**Details:** [05-helm-values.md](./tasks/05-helm-values.md)

---

### Task 06: Configure AWS ALB Ingress
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] Ingress template with AWS ALB annotations
- [ ] SSL/TLS termination configured via ACM certificate ARN (parameterized)
- [ ] Health check paths configured for ALB target groups
- [ ] Sticky sessions configured for SSE connections (until Redis fully tested)
- [ ] Frontend and backend routes properly configured
- [ ] Documentation on ALB Ingress Controller installation prerequisites
**Details:** [06-alb-ingress.md](./tasks/06-alb-ingress.md)

---

### Task 07: Configure Horizontal Pod Autoscaler
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] HPA template for server deployment (CPU/memory based)
- [ ] HPA template for worker deployment (queue depth based if possible, else CPU)
- [ ] HPA template for web deployment (CPU based)
- [ ] Min/max replicas configurable per environment
- [ ] Scale-up and scale-down policies documented
- [ ] Resource requests/limits properly set to enable HPA
**Details:** [07-hpa-config.md](./tasks/07-hpa-config.md)

---

### Task 08: Add OpenTelemetry Datadog Integration
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] OTEL SDK configured to export to Datadog agent
- [ ] Datadog agent deployed as DaemonSet in Helm chart
- [ ] Traces, metrics, and logs configured for export
- [ ] Service name and environment tags properly set
- [ ] `DD_API_KEY` secret reference in deployment
- [ ] Documentation on Datadog setup and dashboard creation
**Details:** [08-otel-datadog.md](./tasks/08-otel-datadog.md)

---

### Task 09: Create Jenkinsfile Templates
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] `Jenkinsfile` at repo root with multi-stage pipeline
- [ ] Stages: Checkout, Install, Lint, Test, Build Images, Push to ECR
- [ ] Environment-specific deployment stages (dev/staging/prod)
- [ ] ECR login and push commands documented
- [ ] Helm upgrade commands for each environment
- [ ] Manual approval gate for production deployment
- [ ] Parameterized build for selecting environment
- [ ] Documentation on Jenkins setup requirements (plugins, credentials)
**Details:** [09-jenkinsfile.md](./tasks/09-jenkinsfile.md)

---

### Task 10: Create Kind Local Testing Setup
**Status:** ⏳ NOT_STARTED
**Standards:** N/A (infrastructure)
**Acceptance Criteria:**
- [ ] `infrastructure/kind/kind-config.yaml` with ingress support
- [ ] `infrastructure/kind/setup.sh` script to create cluster and install dependencies
- [ ] Nginx ingress controller installation for local ALB simulation
- [ ] Local image loading script (kind load docker-image)
- [ ] `infrastructure/kind/teardown.sh` to clean up
- [ ] README with step-by-step local testing instructions
**Details:** [10-kind-local-setup.md](./tasks/10-kind-local-setup.md)

---

### Task 11: Write Comprehensive Deployment Documentation
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/implementation-plan.md`
**Acceptance Criteria:**
- [ ] `infrastructure/README.md` - Overview and quick start
- [ ] `infrastructure/docs/ARCHITECTURE.md` - System architecture diagram and explanation
- [ ] `infrastructure/docs/ENVIRONMENT_VARIABLES.md` - Complete env var reference
- [ ] `infrastructure/docs/LOCAL_TESTING.md` - Kind cluster testing guide
- [ ] `infrastructure/docs/EKS_DEPLOYMENT.md` - Step-by-step EKS deployment
- [ ] `infrastructure/docs/JENKINS_SETUP.md` - Jenkins pipeline setup guide
- [ ] `infrastructure/docs/TROUBLESHOOTING.md` - Common issues and solutions
- [ ] Tech stack explanations (Vite, Effect, Hono, etc.) with "why" context
- [ ] All commands copy-pasteable and tested
**Details:** [11-documentation.md](./tasks/11-documentation.md)

---

### Task 99: Final Verification
**Status:** ⏳ NOT_STARTED
**Standards:** All standards referenced in prior tasks
**Acceptance Criteria:**
- [ ] All prior tasks verified by subagent review
- [ ] Kind cluster deployment tested end-to-end
- [ ] Helm chart installs without errors
- [ ] All environment variables documented
- [ ] Jenkins pipeline syntax validated
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes
- [ ] Documentation reviewed for completeness
**Details:** [99-final-verification.md](./tasks/99-final-verification.md)

---

## Success Criteria

- [ ] **Task 01**: Unified worker handles all job types with mode flag
- [ ] **Task 02**: SSE events work across multiple server replicas via Redis
- [ ] **Task 03**: Single Docker image supports both server and worker modes
- [ ] **Task 04**: Helm chart structure is valid and follows best practices
- [ ] **Task 05**: All three environments have appropriate configurations
- [ ] **Task 06**: ALB Ingress routes traffic correctly with SSL
- [ ] **Task 07**: Pods auto-scale based on load
- [ ] **Task 08**: Traces and metrics flow to Datadog
- [ ] **Task 09**: Jenkins can build, test, and deploy to any environment
- [ ] **Task 10**: Developers can test full K8s deployment locally with Kind
- [ ] **Task 11**: DevOps team can deploy without additional guidance
- [ ] **Task 99**: All code verified against standards, full test suite passes

---

## Target Architecture

```
infrastructure/
├── README.md                          # Quick start guide
├── helm/
│   └── content-studio/
│       ├── Chart.yaml                 # Helm chart metadata
│       ├── values.yaml                # Base values with documentation
│       ├── values-local.yaml          # Kind cluster config
│       ├── values-dev.yaml            # EKS dev environment
│       ├── values-staging.yaml        # EKS staging environment
│       ├── values-prod.yaml           # EKS production environment
│       └── templates/
│           ├── _helpers.tpl           # Template helpers
│           ├── namespace.yaml         # Namespace per environment
│           ├── configmap.yaml         # Non-secret configuration
│           ├── secrets.yaml           # Secret references
│           ├── server-deployment.yaml # Backend API server
│           ├── server-service.yaml    # Server ClusterIP service
│           ├── worker-deployment.yaml # Unified job worker
│           ├── web-deployment.yaml    # Frontend Nginx
│           ├── web-service.yaml       # Frontend ClusterIP service
│           ├── ingress.yaml           # AWS ALB Ingress
│           ├── hpa-server.yaml        # Server auto-scaling
│           ├── hpa-worker.yaml        # Worker auto-scaling
│           ├── hpa-web.yaml           # Web auto-scaling
│           └── datadog-agent.yaml     # Datadog DaemonSet
├── kind/
│   ├── kind-config.yaml               # Kind cluster configuration
│   ├── setup.sh                       # Create cluster + dependencies
│   ├── teardown.sh                    # Clean up cluster
│   └── README.md                      # Local testing instructions
├── docs/
│   ├── ARCHITECTURE.md                # System architecture
│   ├── ENVIRONMENT_VARIABLES.md       # Complete env var reference
│   ├── LOCAL_TESTING.md               # Kind testing guide
│   ├── EKS_DEPLOYMENT.md              # EKS deployment steps
│   ├── JENKINS_SETUP.md               # Jenkins configuration
│   └── TROUBLESHOOTING.md             # Common issues
└── Jenkinsfile                        # CI/CD pipeline (at repo root)

apps/server/src/
├── server.ts                          # Updated with --mode flag
├── workers/
│   ├── unified-worker.ts              # NEW: Combined worker
│   ├── podcast-worker.ts              # Existing (used by unified)
│   └── voiceover-worker.ts            # Existing (used by unified)
└── sse/
    ├── sse-manager.ts                 # Refactored with adapter pattern
    └── adapters/
        ├── memory-adapter.ts          # NEW: In-memory (default)
        └── redis-adapter.ts           # NEW: Redis pub/sub
```

---

## Standards Reference

- `standards/implementation-plan.md` - Plan structure and documentation
- `standards/patterns/use-case.md` - Effect TS patterns for worker refactor
- `standards/patterns/repository.md` - Data access patterns for Redis adapter
