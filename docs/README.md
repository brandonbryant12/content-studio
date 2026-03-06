# Engineering Docs

This directory is the source of truth for architecture, design constraints,
implementation patterns, security expectations, and testing standards.

The docs are organized as a reference system. New owners should not read every
page up front.

## Fast Paths

Choose one entrypoint and follow only that path first.

| If you are... | Start here |
|---|---|
| Taking ownership of the project | [`docs/onboarding/taking-ownership.md`](./onboarding/taking-ownership.md) |
| Changing backend/domain behavior | [`docs/patterns/use-case.md`](./patterns/use-case.md), [`docs/patterns/api-handler.md`](./patterns/api-handler.md), [`docs/testing/overview.md`](./testing/overview.md) |
| Changing frontend behavior | [`docs/frontend/project-structure.md`](./frontend/project-structure.md), [`docs/frontend/data-fetching.md`](./frontend/data-fetching.md), [`docs/frontend/testing.md`](./frontend/testing.md) |
| Working on auth, security, or ops | [`docs/architecture/security.md`](./architecture/security.md), [`docs/architecture/access-control.md`](./architecture/access-control.md), [`docs/architecture/observability.md`](./architecture/observability.md) |
| Confirming canonical product behavior | [`docs/master-spec.md`](./master-spec.md) |

## If You Only Read Four Docs

For the shortest high-signal path, read these in order:

1. [`README.md`](../README.md)
2. [`docs/onboarding/taking-ownership.md`](./onboarding/taking-ownership.md)
3. [`docs/architecture/overview.md`](./architecture/overview.md)
4. [`docs/testing/overview.md`](./testing/overview.md)

## How To Use This Docs Set

- Use `docs/onboarding/` for orientation and ownership handoff.
- Use `docs/architecture/` to understand system shape, trust boundaries, and deployment/runtime concerns.
- Use `docs/patterns/` when changing backend code or runtime wiring.
- Use `docs/frontend/` when changing routes, hooks, forms, streaming, or UI behavior.
- Use `docs/testing/` to decide the required validation surface.
- Use `docs/plans/` for future or conditional directions that are not current architecture.
- Use `docs/spec/generated/` and [`docs/master-spec.md`](./master-spec.md) as canonical reference material, not as first-read onboarding docs.

## Find The Right Doc

| If you need to understand... | Read |
|---|---|
| The end-to-end system shape | [`docs/architecture/overview.md`](./architecture/overview.md) |
| Why the packages and apps are split this way | [`docs/architecture/design.md`](./architecture/design.md) |
| Auth, transport, and asset protection | [`docs/architecture/security.md`](./architecture/security.md) and [`docs/architecture/access-control.md`](./architecture/access-control.md) |
| Backend request handling | [`docs/patterns/api-handler.md`](./patterns/api-handler.md), [`docs/patterns/use-case.md`](./patterns/use-case.md), and [`docs/patterns/repository.md`](./patterns/repository.md) |
| Effect runtime and layer composition | [`docs/patterns/effect-runtime.md`](./patterns/effect-runtime.md) |
| Frontend routing and feature boundaries | [`docs/frontend/project-structure.md`](./frontend/project-structure.md) |
| Query, mutation, and cache rules | [`docs/frontend/data-fetching.md`](./frontend/data-fetching.md) and [`docs/frontend/mutations.md`](./frontend/mutations.md) |
| Forms and error handling in the SPA | [`docs/frontend/forms.md`](./frontend/forms.md) and [`docs/frontend/error-handling.md`](./frontend/error-handling.md) |
| Queue, worker, and async workflows | [`docs/patterns/job-queue.md`](./patterns/job-queue.md) |
| Required test surface for a change | [`docs/testing/overview.md`](./testing/overview.md) |
| Generated API/domain/UI snapshots | [`docs/spec/generated/README.md`](./spec/generated/README.md) |

## Directory Map

- [`docs/onboarding/`](./onboarding/taking-ownership.md): ownership handoff and orientation
- [`docs/architecture/`](./architecture/): system topology, design decisions, security, access control, deployment, observability
- [`docs/plans/`](./plans/README.md): future or conditional directions that may never be implemented
- [`docs/patterns/`](./patterns/): backend implementation patterns and runtime guardrails
- [`docs/frontend/`](./frontend/): SPA architecture, routing, data flow, UI guidance
- [`docs/testing/`](./testing/): coverage strategy and validation expectations by change type
- [`docs/spec/generated/`](./spec/generated/README.md): generated API, data model, domain, and UI snapshots
- [`docs/master-spec.md`](./master-spec.md): canonical application behavior specification
- [`README.md`](../README.md): local setup and development commands

## Maintenance

Run `pnpm scripts:lint` before submitting docs or workflow changes. It validates
local markdown links in:

- `docs/**/*.md`
- `automations/**/*.md`
- `software-factory/workflows/**/*.md`
