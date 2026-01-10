FROM node:22-alpine AS base

ENV NODE_ENV=production

WORKDIR /app

# =========================================================================== #

FROM base AS builder-base

ENV TURBO_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=1

RUN corepack enable pnpm

# =========================================================================== #

FROM builder-base AS builder

RUN pnpm install --global turbo@^2

COPY . .

# https://turbo.build/repo/docs/guides/tools/docker#the-solution
RUN turbo prune server --docker

# =========================================================================== #

FROM builder-base AS installer

COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm --filter=server build

# =========================================================================== #

FROM base AS production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 hono

# Copy built artifacts
COPY --from=installer --chown=hono:nodejs /app/apps/server/dist /app/dist

# Copy entrypoint script
COPY --chown=hono:nodejs apps/server/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER hono

# Default environment
ENV MODE=server

# Note: Healthcheck varies by mode
# - server mode: HTTP check to /healthcheck endpoint
# - worker mode: File-based check on /tmp/worker-health
# Kubernetes liveness/readiness probes should be used instead of Docker HEALTHCHECK
# for production deployments. This HEALTHCHECK is for local Docker testing only.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD if [ "$MODE" = "server" ]; then \
        wget --quiet --spider http://localhost:${SERVER_PORT:-3000}/healthcheck || exit 1; \
      else \
        test -f /tmp/worker-health && \
        [ $(($(date +%s) - $(cat /tmp/worker-health | cut -c1-10))) -lt 120 ] || exit 1; \
      fi

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--mode=server"]
