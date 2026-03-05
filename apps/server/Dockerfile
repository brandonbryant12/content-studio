# syntax=docker/dockerfile:1

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

RUN pnpm install --global turbo@2.6.1

COPY . .

# https://turbo.build/repo/docs/guides/tools/docker#the-solution
RUN turbo prune server --docker

# =========================================================================== #

FROM builder-base AS installer

COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    NODE_ENV=development pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm --filter=server build

# =========================================================================== #

FROM base AS production

RUN apk add --no-cache tini

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 hono

COPY --from=installer --chown=hono:nodejs /app/apps/server/dist /app/dist
COPY --from=installer --chown=hono:nodejs /app/packages/db/drizzle /app/drizzle

ENV SERVER_RUN_DB_MIGRATIONS_ON_STARTUP=true

USER hono

ENTRYPOINT ["/sbin/tini", "--"]

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --spider http://0.0.0.0:3036/healthcheck || exit 1

CMD ["node", "/app/dist/server.mjs"]
