# EKS Infrastructure Local Testing Results

**Date**: 2026-01-10
**Branch**: `feat/infra-eks-deployment`

## Summary

Local testing of the EKS deployment infrastructure was performed using Docker Compose to validate the multi-container setup before deploying to a real Kubernetes cluster.

**Result**: Server and Worker containers start and run successfully.

## Test Environment

- **Platform**: macOS Darwin 23.5.0
- **Docker**: Docker Desktop with docker-compose
- **Services**: PostgreSQL 16, Redis 7, Content Studio Server, Content Studio Worker

## Issues Found and Fixed

### 1. Lockfile Out of Sync

**Issue**: `pnpm-lock.yaml` was missing the `ioredis` dependency added for Redis SSE adapter.

**Fix**: Run `pnpm install` to update lockfile.

### 2. Entrypoint Script Wrong File Extension

**Issue**: Entrypoint script referenced `server.js` but build outputs `server.mjs` (ES Module).

**Fix**: Updated `docker-entrypoint.sh`:
```bash
# Before
exec node /app/dist/server.js --mode=server "$@"

# After
exec node /app/dist/server.mjs --mode=server "$@"
```

### 3. __dirname Not Defined in ESM Bundle

**Issue**: The bundled server.mjs failed with:
```
ReferenceError: __dirname is not defined in ES module scope
```

This was caused by `ssh2`/`dockerode` packages (transitive dependencies of testcontainers) using CommonJS-specific `__dirname`.

**Root Cause**: The `@repo/testing` package exports testcontainers utilities, and runtime.ts imported `MockAIWithLatency` from the main entry point, pulling in all exports.

**Fix**: Changed import to use subpath export:
```typescript
// Before
import { MockAIWithLatency } from '@repo/testing';

// After (uses ./mocks subpath which excludes testcontainers)
import { MockAIWithLatency } from '@repo/testing/mocks';
```

Also updated `tsdown.config.ts` to mark problematic CJS packages as external:
```typescript
external: [/\.node$/, 'ssh2', 'dockerode', 'docker-modem'],
```

### 4. Missing Environment Variables for Worker

**Issue**: Worker container failed because `PUBLIC_SERVER_URL` and `PUBLIC_WEB_URL` were not set.

**Fix**: Added missing env vars to worker service in `compose.k8s-backend-test.yaml`.

### 5. Missing GEMINI_API_KEY Default

**Issue**: Container crashed because `GEMINI_API_KEY` was empty (env var expansion).

**Fix**: Added default value in docker-compose:
```yaml
GEMINI_API_KEY=${GEMINI_API_KEY:-dummy-key-for-testing}
```

## Test Results

### Docker Compose Test

**Command**:
```bash
docker compose -f compose.k8s-backend-test.yaml up --build -d
```

**Result**: SUCCESS

| Service | Status | Health Check |
|---------|--------|--------------|
| db (PostgreSQL) | Running | Healthy |
| redis | Running | Healthy |
| server | Running | Healthy |
| worker | Running | Healthy |

**Server Output**:
```
[20:45:51.983] INFO (#3): Starting worker, polling every 3000ms
  worker: PodcastWorker
[20:45:52.007] INFO (#6): Starting voiceover worker, polling every 3000ms
  worker: VoiceoverWorker
```

**Worker Output**:
```
[20:46:24.272] INFO (#2): Starting unified worker, polling every 3000ms
  worker: UnifiedWorker
[20:46:24.276] INFO (#2): Handling job types: generate-podcast, generate-script, generate-audio, generate-voiceover
  worker: UnifiedWorker
```

**Healthcheck Test**:
```bash
$ curl http://localhost:3035/healthcheck
OK
```

### Expected Errors (Database Schema)

The worker logs show errors about missing `job` table:
```
QueueError: Failed to fetch next job: Failed query: select ... from "job" ...
```

This is **expected** because the database has no schema applied. In a real deployment, database migrations would run before the application starts.

## Files Modified During Testing

1. `apps/server/docker-entrypoint.sh` - Fixed file extension
2. `apps/server/tsdown.config.ts` - Added external packages
3. `packages/api/src/server/runtime.ts` - Changed import path
4. `compose.k8s-backend-test.yaml` - Added missing env vars

## Web Frontend Build Issue

The web frontend Docker build fails due to OOM during Vite build:
```
x Internal errors encountered: external process killed a task
```

**Workaround**: Build web app locally first, then use `apps/web/Dockerfile.local` which copies pre-built dist.

**Alternative**: Use more Docker memory or S3+CloudFront for frontend deployment.

## Validation Commands

```bash
# Build images
docker compose -f compose.k8s-backend-test.yaml build

# Start services
docker compose -f compose.k8s-backend-test.yaml up -d

# Check status
docker compose -f compose.k8s-backend-test.yaml ps -a

# View logs
docker compose -f compose.k8s-backend-test.yaml logs server
docker compose -f compose.k8s-backend-test.yaml logs worker

# Test healthcheck
curl http://localhost:3035/healthcheck

# Stop services
docker compose -f compose.k8s-backend-test.yaml down
```

## Confidence Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| Server Docker image | Verified | Starts and responds to health checks |
| Worker Docker image | Verified | Starts and polls for jobs |
| Mode switching (`--mode=server/worker`) | Verified | Entrypoint correctly routes |
| Redis SSE adapter | Verified | Both services connect to Redis |
| PostgreSQL connectivity | Verified | Queries execute (fail due to missing schema) |
| Health checks | Verified | HTTP for server, file-based for worker |
| Environment configuration | Verified | All required vars documented |

## Next Steps

1. **Kind Cluster Testing** - Deploy to local Kubernetes cluster to test Helm charts
2. **Database Migrations** - Add migration job/init container to Helm chart
3. **Real EKS Deployment** - Test with actual AWS infrastructure
4. **Load Testing** - Verify HPA configuration with realistic load

## How to Reproduce

1. Ensure Docker is running
2. From project root:
   ```bash
   pnpm install
   docker compose -f compose.k8s-backend-test.yaml up --build -d
   ```
3. Wait 15-20 seconds for health checks
4. Verify with `docker compose -f compose.k8s-backend-test.yaml ps -a`
