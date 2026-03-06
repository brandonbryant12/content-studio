# Taking Ownership

This guide is the fastest path for a developer who is becoming responsible for
Content Studio.

Use it to get productive first. Open the deeper reference docs only when you
touch those areas.

## What This System Is

Content Studio is a monorepo for experimenting with multimodal AI workflows:

- sources ingest the input material
- personas shape style and voice
- podcasts, voiceovers, and infographics generate outputs
- the web app drives authoring, the server handles sync APIs, and the worker
  finishes async jobs

The system is split into three apps and a set of shared packages:

- `apps/web`: React SPA with TanStack Router and Query
- `apps/server`: Hono API server and auth/static entrypoint
- `apps/worker`: background job execution and SSE publishing
- `packages/*`: domain logic, contracts, auth, DB, queue, storage, AI providers,
  and shared UI

## Read In This Order

If you are new, do not start by reading every document in `docs/`.

1. [`README.md`](../../README.md): local setup and day-to-day commands
2. [`docs/architecture/overview.md`](../architecture/overview.md): system shape
3. [`docs/architecture/design.md`](../architecture/design.md): why the repo is
   split this way
4. [`docs/testing/overview.md`](../testing/overview.md): how to validate changes

Then choose one track:

- Backend ownership:
  [`docs/patterns/use-case.md`](../patterns/use-case.md),
  [`docs/patterns/api-handler.md`](../patterns/api-handler.md),
  [`docs/patterns/effect-runtime.md`](../patterns/effect-runtime.md)
- Frontend ownership:
  [`docs/frontend/project-structure.md`](../frontend/project-structure.md),
  [`docs/frontend/data-fetching.md`](../frontend/data-fetching.md),
  [`docs/frontend/testing.md`](../frontend/testing.md)
- Security and ops ownership:
  [`docs/architecture/security.md`](../architecture/security.md),
  [`docs/architecture/access-control.md`](../architecture/access-control.md),
  [`docs/architecture/observability.md`](../architecture/observability.md)

## Mental Model

Keep these five rules in your head:

1. Handlers stay thin. They call one use case and serialize the result.
2. Use cases own business logic, authorization, and orchestration.
3. Repositories own DB access and should not absorb business logic.
4. Async generation work goes through the job queue and finishes in
   `apps/worker`.
5. Frontend route files stay thin and delegate to feature modules.

## Where To Make Changes

| If you need to change... | Start here |
|---|---|
| API input/output or endpoint behavior | `packages/api/src/contracts`, then [`docs/patterns/api-handler.md`](../patterns/api-handler.md) |
| Domain rules or authorization | `packages/media/src/*/use-cases`, then [`docs/patterns/use-case.md`](../patterns/use-case.md) |
| DB queries or persistence | `packages/media/src/*/repos`, then [`docs/patterns/repository.md`](../patterns/repository.md) |
| Async generation flow | `packages/queue`, `apps/worker`, then [`docs/patterns/job-queue.md`](../patterns/job-queue.md) |
| Web route, query, or mutation wiring | `apps/web/src/routes` and `apps/web/src/features`, then [`docs/frontend/project-structure.md`](../frontend/project-structure.md) and [`docs/frontend/data-fetching.md`](../frontend/data-fetching.md) |
| Auth, roles, or ownership rules | `packages/auth`, then [`docs/architecture/access-control.md`](../architecture/access-control.md) |
| Canonical product behavior | [`docs/master-spec.md`](../master-spec.md) |

## Safe First Week Workflow

Use this default loop until the codebase feels familiar:

1. Run `pnpm setup:local` if the machine is new.
2. Run `pnpm dev` when working across the stack.
3. Make the smallest change that proves the path is correct.
4. Run the closest relevant test first.
5. Before closing work, run `pnpm typecheck` and `pnpm test:invariants`.

Good narrow checks:

- backend/domain change: `pnpm --filter @repo/media test`
- API/handler change: `pnpm --filter @repo/api test`
- frontend change: `pnpm --filter web test`
- broad confidence pass: `pnpm test`

## Common Pitfalls

- Do not put business logic in handlers or React route files.
- Do not bypass repos with direct DB imports from use cases.
- Do not rely on client filtering as authorization.
- Do not hardcode query keys for invalidation.
- Do not treat `docs/master-spec.md` as an onboarding guide; it is the canonical
  behavior reference.

## When To Open Deeper Docs

| Situation | Open |
|---|---|
| Adding or refactoring backend workflows | [`docs/patterns/`](../patterns/) |
| Working on UI composition, forms, or streaming UX | [`docs/frontend/`](../frontend/) |
| Deciding test scope or CI confidence level | [`docs/testing/`](../testing/) |
| Reviewing deployment, telemetry, or environment behavior | [`docs/architecture/`](../architecture/) |
| Confirming generated API/domain/UI surface | [`docs/spec/generated/README.md`](../spec/generated/README.md) |

## What Not To Read First

These docs are useful, but usually not where a new owner should begin:

- [`docs/master-spec.md`](../master-spec.md): canonical spec and generated
  reference inventory
- [`docs/spec/generated/`](../spec/generated/README.md): generated surfaces
- [`docs/plans/`](../plans/README.md): future or conditional directions, not
  current implementation guidance
- deep environment/deployment docs unless you are operating that surface now
