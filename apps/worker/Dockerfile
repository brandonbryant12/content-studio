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
