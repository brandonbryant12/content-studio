# Engineering Standards Docs

This directory is the standards source of record.

These standards are part of an experimental technique called **Agent Harnessing**:
steering AI-authored changes with explicit docs, skills, and automated checks.
Treat this operating model as experimental and expected to evolve.

All new code reviews and feature work should reference [`docs/`](./) standards plus [`agentic-harness-framework/`](../agentic-harness-framework/) control maps where applicable.

## Start Here

1. [`docs/master-spec.md`](./master-spec.md)
2. [`agentic-harness-framework/README.md`](../agentic-harness-framework/README.md)
3. [`agentic-harness-framework/control-surfaces.md`](../agentic-harness-framework/control-surfaces.md)
4. [`docs/architecture/overview.md`](./architecture/overview.md)
5. [`docs/patterns/use-case.md`](./patterns/use-case.md)
6. [`docs/patterns/api-handler.md`](./patterns/api-handler.md)
7. [`docs/patterns/safety-primitives.md`](./patterns/safety-primitives.md)
8. [`docs/testing/overview.md`](./testing/overview.md)
9. [`docs/frontend/project-structure.md`](./frontend/project-structure.md)
10. [`docs/architecture/observability.md`](./architecture/observability.md)
11. [`docs/workflow.md`](./workflow.md)
12. [`docs/workflow-memory/README.md`](./workflow-memory/README.md)
13. [`docs/architecture/effect-vs-nestjs.md`](./architecture/effect-vs-nestjs.md)

## Directory Layout

- [`docs/architecture/`](./architecture/) - system boundaries, access control, observability
- [`docs/patterns/`](./patterns/) - backend implementation patterns and constraints
- [`docs/frontend/`](./frontend/) - frontend architecture and UI standards
- [`docs/testing/`](./testing/) - testing strategy and required coverage by change type
- [`agentic-harness-framework/`](../agentic-harness-framework/) - repository operating model and control-surface map
- [`docs/setup.md`](./setup.md) - local development and test environment setup
- [`docs/master-spec.md`](./master-spec.md) - canonical, PR-governed master application specification
- [`docs/workflow.md`](./workflow.md) - AI feature-delivery flow, scan cadence, and self-improvement loop
- [`docs/workflow-memory/`](./workflow-memory/) - structured workflow memory system (events, index, summaries, guardrails)
