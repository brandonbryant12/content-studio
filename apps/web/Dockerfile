# syntax=docker/dockerfile:1

FROM node:22-slim AS base

WORKDIR /app

ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=1

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
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    NODE_ENV=development pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .

# Build with safe placeholders; runtime PUBLIC_* values are injected by
# entrypoint.sh into dist/env.js when the container starts.
ARG PUBLIC_SERVER_URL="http://placeholder.invalid"
ARG PUBLIC_SERVER_API_PATH="/api"
ARG PUBLIC_AUTH_MODE="dev-password"
ARG PUBLIC_WEB_URL="http://placeholder.invalid"
ARG PUBLIC_BASE_PATH="/"
ENV PUBLIC_SERVER_URL="${PUBLIC_SERVER_URL}" \
    PUBLIC_SERVER_API_PATH="${PUBLIC_SERVER_API_PATH}" \
    PUBLIC_AUTH_MODE="${PUBLIC_AUTH_MODE}" \
    PUBLIC_WEB_URL="${PUBLIC_WEB_URL}" \
    PUBLIC_BASE_PATH="${PUBLIC_BASE_PATH}"

RUN pnpm --filter web build

# =========================================================================== #

FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache tini

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
