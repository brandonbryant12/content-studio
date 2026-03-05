# Engineering Standards Docs

This directory is the source of truth for architecture, design constraints, security expectations, implementation patterns, and testing standards.

Use these docs before changing code or reviewing a PR.

## Start Here By Role

| Role | Start here |
|---|---|
| Product | [`docs/architecture/overview.md`](./architecture/overview.md), [`docs/architecture/design.md`](./architecture/design.md), [`docs/master-spec.md`](./master-spec.md) |
| Backend | [`docs/architecture/overview.md`](./architecture/overview.md), [`docs/patterns/use-case.md`](./patterns/use-case.md), [`docs/patterns/api-handler.md`](./patterns/api-handler.md), [`docs/patterns/effect-runtime.md`](./patterns/effect-runtime.md), [`docs/testing/overview.md`](./testing/overview.md) |
| Frontend | [`docs/architecture/overview.md`](./architecture/overview.md), [`docs/frontend/project-structure.md`](./frontend/project-structure.md), [`docs/frontend/data-fetching.md`](./frontend/data-fetching.md), [`docs/frontend/error-handling.md`](./frontend/error-handling.md), [`docs/frontend/testing.md`](./frontend/testing.md) |
| Ops | [`docs/architecture/security.md`](./architecture/security.md), [`docs/architecture/access-control.md`](./architecture/access-control.md), [`docs/architecture/deployment-env-matrix.md`](./architecture/deployment-env-matrix.md), [`docs/architecture/observability.md`](./architecture/observability.md), [`docs/architecture/datadog.md`](./architecture/datadog.md) |

## Diagram Conventions

| Visual | Meaning |
|---|---|
| Blue node or phase | Human/test entry point or caller-owned edge |
| Green node or phase | Content Studio runtime code we own |
| Amber node or phase | Queue, worker, SSE, or another async handoff |
| Gray node or phase | Stateful dependency or external system |
| Red node or phase | Security/auth control or trust-boundary check |
| Left-to-right actor order | Caller -> runtime -> control/domain -> store/external |

## Read This First

1. [`docs/architecture/overview.md`](./architecture/overview.md)
2. [`docs/architecture/design.md`](./architecture/design.md)
3. [`docs/architecture/security.md`](./architecture/security.md)
4. [`docs/architecture/access-control.md`](./architecture/access-control.md)
5. [`docs/architecture/observability.md`](./architecture/observability.md)
6. [`docs/patterns/use-case.md`](./patterns/use-case.md)
7. [`docs/patterns/api-handler.md`](./patterns/api-handler.md)
8. [`docs/patterns/effect-runtime.md`](./patterns/effect-runtime.md)
9. [`docs/frontend/project-structure.md`](./frontend/project-structure.md)
10. [`docs/testing/overview.md`](./testing/overview.md)
11. [`docs/master-spec.md`](./master-spec.md)

## Find The Right Doc

| If you need to understand... | Read |
|---|---|
| The end-to-end system shape | [`docs/architecture/overview.md`](./architecture/overview.md) |
| Why the packages and apps are split this way | [`docs/architecture/design.md`](./architecture/design.md) |
| Auth, transport, rate limiting, and asset protection | [`docs/architecture/security.md`](./architecture/security.md) and [`docs/architecture/access-control.md`](./architecture/access-control.md) |
| Backend request handling | [`docs/patterns/api-handler.md`](./patterns/api-handler.md), [`docs/patterns/use-case.md`](./patterns/use-case.md), and [`docs/patterns/repository.md`](./patterns/repository.md) |
| Effect runtime and layer composition | [`docs/patterns/effect-runtime.md`](./patterns/effect-runtime.md) |
| Frontend routing and feature boundaries | [`docs/frontend/project-structure.md`](./frontend/project-structure.md) |
| Query/mutation/cache rules | [`docs/frontend/data-fetching.md`](./frontend/data-fetching.md) and [`docs/frontend/mutations.md`](./frontend/mutations.md) |
| Forms and error handling in the SPA | [`docs/frontend/forms.md`](./frontend/forms.md) and [`docs/frontend/error-handling.md`](./frontend/error-handling.md) |
| Queue, worker, and async workflows | [`docs/patterns/job-queue.md`](./patterns/job-queue.md) |
| Required test surface for a change | [`docs/testing/overview.md`](./testing/overview.md) |
| Product behavior and generated surfaces | [`docs/master-spec.md`](./master-spec.md) and [`docs/spec/generated/README.md`](./spec/generated/README.md) |

## Directory Map

- [`docs/architecture/`](./architecture/) - runtime topology, design decisions, security, access control, deployment, observability
- [`docs/patterns/`](./patterns/) - backend implementation patterns and guardrails
- [`docs/frontend/`](./frontend/) - SPA architecture, routing, data flow, UI guidance
- [`docs/testing/`](./testing/) - coverage strategy and required validation by change type
- [`docs/spec/generated/`](./spec/generated/) - generated API, data model, domain, and UI snapshots
- [`docs/master-spec.md`](./master-spec.md) - canonical application behavior specification
- [`README.md`](../README.md) - environment setup and local development commands

## Maintenance

Run `pnpm scripts:lint` before submitting docs or workflow changes. It validates local markdown links in:

- `docs/**/*.md`
- `automations/**/*.md`
- `software-factory/workflows/**/*.md`
