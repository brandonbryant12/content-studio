# Engineering Standards Docs

This directory is the standards source of record for engineering patterns and technology decisions.

All new code reviews and feature work should reference [`docs/`](./) standards.

## Start Here

1. [`docs/master-spec.md`](./master-spec.md)
2. [`docs/architecture/overview.md`](./architecture/overview.md)
3. [`docs/patterns/use-case.md`](./patterns/use-case.md)
4. [`docs/patterns/api-handler.md`](./patterns/api-handler.md)
5. [`docs/patterns/safety-primitives.md`](./patterns/safety-primitives.md)
6. [`docs/patterns/prompt-registry.md`](./patterns/prompt-registry.md)
7. [`docs/testing/overview.md`](./testing/overview.md)
8. [`docs/frontend/project-structure.md`](./frontend/project-structure.md)
9. [`docs/architecture/observability.md`](./architecture/observability.md)
10. [`docs/architecture/effect-vs-nestjs.md`](./architecture/effect-vs-nestjs.md)

## Directory Layout

- [`docs/architecture/`](./architecture/) - system boundaries, access control, observability
- [`docs/patterns/`](./patterns/) - backend implementation patterns and constraints
- [`docs/frontend/`](./frontend/) - frontend architecture and UI standards
- [`docs/testing/`](./testing/) - testing strategy and required coverage by change type
- [`README.md`](../README.md) - local development and test environment setup
- [`docs/master-spec.md`](./master-spec.md) - canonical, PR-governed master application specification

## Link Guardrail

Run `pnpm scripts:lint` before submitting docs/playbook changes. It validates local markdown links in:

- `docs/**/*.md`
- `automations/**/*.md`
- `software-factory/workflows/**/*.md`
