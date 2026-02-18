# Content Studio

Content Studio is engineered as a spec-driven system.
Behavior is defined in specs, implemented in code, and proven by automated gates.

## Read This First

1. Engineering philosophy and delivery model: `README.md`
2. Product/domain guide with diagrams: `README.product.md`
3. Developer setup and daily commands: `README.dev.md`
4. Master behavioral spec (source of truth): `docs/master-spec.md`

## Spec-Driven Philosophy

1. Specify before building.
Every behavior change starts with a pull request that updates `docs/master-spec.md`.
2. Generate what should not be hand-maintained.
`docs/spec/generated/*` is derived from contracts, use cases, schema, and routes.
3. Enforce drift detection.
`pnpm spec:check` fails when implementation and spec snapshots diverge.
4. Keep architectural boundaries explicit.
Contracts define API behavior, handlers orchestrate, use cases own business logic, repositories own persistence.
5. Treat tests as executable policy.
Type checks, tests, invariants, and build outputs are required evidence for merge.

## How Agent Skills And Specs Work Together

The codebase is built by pairing spec artifacts with focused agent skills:

1. `content-studio-feature-delivery`
Translates spec deltas into vertical slices with tests and docs updates.
2. `content-studio-tanstack-vite`
Applies frontend guardrails for routing, data fetching, caching, and forms in `apps/web`.
3. `content-studio-periodic-scans`
Runs recurring quality audits to catch drift across architecture, tests, performance, and docs.
4. `content-studio-self-improvement`
Converts repeated failures into stronger guardrails (docs, tests, scripts, and skill updates).

Skill source of truth is `.agents/skills`, mirrored via `scripts/sync-skills.sh`.

## Delivery Contract

For behavior-changing work, the required sequence is:

1. Update `docs/master-spec.md` (and generated spec snapshots as needed).
2. Implement the change inside existing architecture boundaries.
3. Run quality gates:
`pnpm spec:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:invariants`, `pnpm build`.
4. Merge only when spec and code are aligned.

## CI/CD Model

This repository uses Jenkins pipeline definitions in:

1. `Jenkinsfile` (pre-merge / branch CI)
2. `jenkins/Jenkinsfile.main-cd.groovy` (main branch CI/CD)
3. `jenkins/Jenkinsfile.nightly-hygiene.groovy` (nightly deep checks)
4. `jenkins/Jenkinsfile.weekly-maintenance.groovy` (weekly cleanliness checks)
5. `jenkins/README.md` (job setup and operational guidance)

## Codebase Layout

```
apps/
  server/     # HTTP entrypoint (Hono + oRPC runtime wiring)
  web/        # React SPA (TanStack Router/Query/Form)
  worker/     # Background processing for queued jobs
packages/
  api/        # Contracts, routers, handlers
  media/      # Domain use cases and repositories
  db/         # Drizzle schema, serializers, migrations
  auth/       # Authentication and authorization policy
  ai/         # LLM/TTS providers
  queue/      # Job queue abstraction
  storage/    # File storage abstraction
  ui/         # Shared UI primitives
  testing/    # Test utilities
```

## Supporting Docs

1. Standards index: `docs/README.md`
2. Architecture: `docs/architecture/overview.md`
3. Delivery workflow and memory loop: `docs/workflow.md`
4. Setup details: `docs/setup.md`
