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

WORKDIR /app

ENV TURBO_TELEMETRY_DISABLED=1 \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=1 \
    NODE_ENV=production \
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

RUN apk add --no-cache ca-certificates \
    && if [ -n "$CORPORATE_CA_CERT_FILE" ] && [ -s "/opt/content-studio/certs/$CORPORATE_CA_CERT_FILE" ]; then \
         cat "/opt/content-studio/certs/$CORPORATE_CA_CERT_FILE" >> /etc/ssl/certs/ca-certificates.crt; \
       fi

RUN corepack enable pnpm \
    && pnpm install --global turbo@2.6.1

# =========================================================================== #

FROM base AS builder

COPY . .

RUN turbo prune @repo/db --docker

# =========================================================================== #

FROM base AS runner

COPY --from=builder /app/out/json/ .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    NODE_ENV=development pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .

CMD ["pnpm", "--filter=@repo/db", "migrate"]
