# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

WORKDIR /app

ENV TURBO_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=1
ENV NODE_ENV=production

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
