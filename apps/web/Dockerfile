ARG DOCKER_REGISTRY="docker.io"
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY=""
ARG NODE_EXTRA_CA_CERTS=""

FROM ${DOCKER_REGISTRY}/node:22-slim AS base

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG NODE_EXTRA_CA_CERTS

WORKDIR /app

ENV NODE_ENV=production \
    TURBO_TELEMETRY_DISABLED=1 \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=1 \
    HTTP_PROXY="${HTTP_PROXY}" \
    HTTPS_PROXY="${HTTPS_PROXY}" \
    NO_PROXY="${NO_PROXY}" \
    http_proxy="${HTTP_PROXY}" \
    https_proxy="${HTTPS_PROXY}" \
    no_proxy="${NO_PROXY}" \
    npm_config_proxy="${HTTP_PROXY}" \
    npm_config_https_proxy="${HTTPS_PROXY}" \
    NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS}"

COPY docker/certs/ /opt/content-studio/certs/

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && if [ -n "$NODE_EXTRA_CA_CERTS" ] && [ -s "$NODE_EXTRA_CA_CERTS" ]; then \
         cat "$NODE_EXTRA_CA_CERTS" >> /etc/ssl/certs/ca-certificates.crt; \
       fi \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable pnpm

# =========================================================================== #

FROM base AS builder

RUN pnpm install --global turbo@2.6.1

COPY . .

# https://turbo.build/repo/docs/guides/tools/docker#the-solution
RUN turbo prune web --docker

# =========================================================================== #

FROM base AS installer

COPY --from=builder /app/out/json/ .
RUN NODE_ENV=development pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .

# Build with safe placeholders; runtime PUBLIC_* values are injected by
# entrypoint.sh into dist/env.js when the container starts.
ARG PUBLIC_SERVER_URL="http://placeholder.invalid"
ARG PUBLIC_SERVER_API_PATH="/api"
ARG PUBLIC_AUTH_MODE="dev-password"
ARG PUBLIC_DISABLE_DEEP_RESEARCH="false"
ARG PUBLIC_WEB_URL="http://placeholder.invalid"
ARG PUBLIC_BASE_PATH="/"
ENV PUBLIC_SERVER_URL="${PUBLIC_SERVER_URL}" \
    PUBLIC_SERVER_API_PATH="${PUBLIC_SERVER_API_PATH}" \
    PUBLIC_AUTH_MODE="${PUBLIC_AUTH_MODE}" \
    PUBLIC_DISABLE_DEEP_RESEARCH="${PUBLIC_DISABLE_DEEP_RESEARCH}" \
    PUBLIC_WEB_URL="${PUBLIC_WEB_URL}" \
    PUBLIC_BASE_PATH="${PUBLIC_BASE_PATH}"

RUN pnpm --filter web build

# =========================================================================== #

FROM ${DOCKER_REGISTRY}/node:22-alpine AS production

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG NODE_EXTRA_CA_CERTS

WORKDIR /app

ENV HTTP_PROXY="${HTTP_PROXY}" \
    HTTPS_PROXY="${HTTPS_PROXY}" \
    NO_PROXY="${NO_PROXY}" \
    http_proxy="${HTTP_PROXY}" \
    https_proxy="${HTTPS_PROXY}" \
    no_proxy="${NO_PROXY}" \
    NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS}"

COPY docker/certs/ /opt/content-studio/certs/

RUN apk add --no-cache ca-certificates tini \
    && if [ -n "$NODE_EXTRA_CA_CERTS" ] && [ -s "$NODE_EXTRA_CA_CERTS" ]; then \
         cat "$NODE_EXTRA_CA_CERTS" >> /etc/ssl/certs/ca-certificates.crt; \
       fi

RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 --ingroup app app

# Copy built SPA and runtime scripts with app ownership so entrypoint can write env.js
COPY --from=installer --chown=app:app /app/apps/web/dist ./dist
COPY --chown=app:app apps/web/serve.js ./serve.js
COPY --chown=app:app apps/web/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

USER app

ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:8080/healthcheck || exit 1

CMD ["./entrypoint.sh"]
