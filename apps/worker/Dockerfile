# syntax=docker/dockerfile:1
ARG DOCKER_REGISTRY="docker.io"
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY=""
ARG NODE_EXTRA_CA_CERTS=""
ARG CORPORATE_CA_CERT_FILE=""

FROM ${DOCKER_REGISTRY}/node:22-alpine AS base

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG NODE_EXTRA_CA_CERTS
ARG CORPORATE_CA_CERT_FILE

ENV NODE_ENV=production \
    HTTP_PROXY="${HTTP_PROXY}" \
    HTTPS_PROXY="${HTTPS_PROXY}" \
    NO_PROXY="${NO_PROXY}" \
    http_proxy="${HTTP_PROXY}" \
    https_proxy="${HTTPS_PROXY}" \
    no_proxy="${NO_PROXY}" \
    npm_config_proxy="${HTTP_PROXY}" \
    npm_config_https_proxy="${HTTPS_PROXY}" \
    NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS}"

WORKDIR /app

COPY docker/certs/ /opt/content-studio/certs/

RUN apk add --no-cache ca-certificates \
    && if [ -n "$CORPORATE_CA_CERT_FILE" ] && [ -s "/opt/content-studio/certs/$CORPORATE_CA_CERT_FILE" ]; then \
         cat "/opt/content-studio/certs/$CORPORATE_CA_CERT_FILE" >> /etc/ssl/certs/ca-certificates.crt; \
       fi

# =========================================================================== #

FROM base AS builder-base

ENV TURBO_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm:$PATH"
ENV CI=1

RUN corepack enable pnpm

# =========================================================================== #

FROM builder-base AS builder

RUN pnpm install --global turbo@2.6.1

COPY . .

# https://turbo.build/repo/docs/guides/tools/docker#the-solution
RUN turbo prune worker --docker

# =========================================================================== #

FROM builder-base AS installer

COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    NODE_ENV=development pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm --filter=worker build

# =========================================================================== #

FROM base AS production

RUN apk add --no-cache tini

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 worker

COPY --from=installer --chown=worker:nodejs /app/apps/worker/dist /app/dist

USER worker

ENTRYPOINT ["/sbin/tini", "--"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "/app/dist/worker.mjs"]
