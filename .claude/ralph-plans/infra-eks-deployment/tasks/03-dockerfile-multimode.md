# Task 03: Update Dockerfiles for Multi-Mode Support

## Standards Checklist

Before starting implementation, read and understand:
- [ ] Existing `apps/server/Dockerfile` structure

## Context

The current server Dockerfile builds a single image that runs the full server (HTTP + workers). For Kubernetes, we want to use the same image but run it in different modes:

- `--mode=server` - Run HTTP server only (or HTTP + workers for simple deployments)
- `--mode=worker` - Run unified worker only

This allows independent scaling of API servers and workers while maintaining a single build artifact.

## Key Files

- `apps/server/Dockerfile` - Update for multi-mode support
- `apps/server/docker-entrypoint.sh` - NEW: Entrypoint script for mode handling
- `apps/web/Dockerfile` - Review/minor updates if needed

## Implementation Steps

### 3.1 Create Entrypoint Script

Create `apps/server/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e

# Default mode is server
MODE="${MODE:-server}"

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --mode=*)
      MODE="${arg#*=}"
      shift
      ;;
  esac
done

echo "Starting Content Studio in ${MODE} mode..."

case $MODE in
  server)
    exec node /app/dist/server.js --mode=server "$@"
    ;;
  worker)
    exec node /app/dist/server.js --mode=worker "$@"
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Valid modes: server, worker"
    exit 1
    ;;
esac
```

### 3.2 Update Server Dockerfile

Update `apps/server/Dockerfile`:

```dockerfile
# ... existing build stages ...

FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono
USER hono

# Copy built artifacts
COPY --from=installer --chown=hono:nodejs /app/apps/server/dist ./dist
COPY --from=installer --chown=hono:nodejs /app/apps/server/package.json ./

# Copy entrypoint script
COPY --chown=hono:nodejs apps/server/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default environment
ENV NODE_ENV=production
ENV MODE=server

# Health check - different for each mode
# For server mode: HTTP check
# For worker mode: File-based check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD if [ "$MODE" = "server" ]; then \
        wget --quiet --spider http://localhost:${SERVER_PORT:-3035}/healthcheck || exit 1; \
      else \
        test -f /tmp/worker-health && \
        [ $(($(date +%s) - $(cat /tmp/worker-health))) -lt 60 ] || exit 1; \
      fi

EXPOSE 3035

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--mode=server"]
```

### 3.3 Update Health Check Logic in Worker

Ensure the unified worker writes health status:

```typescript
// In unified-worker.ts
const writeHealthStatus = () => {
  fs.writeFileSync('/tmp/worker-health', Math.floor(Date.now() / 1000).toString());
};

// Call this in the main loop
while (running) {
  writeHealthStatus();
  const job = await pollForJob();
  // ... handle job
}
```

### 3.4 Test Docker Build

```bash
# Build the image
docker build -t content-studio-server:test -f apps/server/Dockerfile .

# Test server mode
docker run --rm -e SERVER_PORT=3035 content-studio-server:test --mode=server

# Test worker mode
docker run --rm content-studio-server:test --mode=worker

# Test with MODE env var
docker run --rm -e MODE=worker content-studio-server:test
```

### 3.5 Update Web Dockerfile (if needed)

Review `apps/web/Dockerfile` for consistency:
- Ensure health check is properly configured
- Verify nginx configuration serves SPA correctly
- No mode changes needed (frontend is always static files)

## Docker Compose for Local Testing

Update `compose.yaml` or create `compose.k8s-test.yaml`:

```yaml
services:
  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    command: ["--mode=server"]
    environment:
      - MODE=server
      - SERVER_PORT=3035
    ports:
      - "3035:3035"

  worker:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    command: ["--mode=worker"]
    environment:
      - MODE=worker
    depends_on:
      - server
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Verification Log

<!-- Agent writes verification results here -->
