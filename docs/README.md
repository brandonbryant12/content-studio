# Engineering Standards Docs

This directory is the standards source of record.

These standards are part of an experimental technique called **Agent Harnessing**:
steering AI-authored changes with explicit docs, skills, and automated checks.
Treat this operating model as experimental and expected to evolve.

All new code reviews and feature work should reference `docs/` standards plus `agentic-harness-framework/` control maps where applicable.

## Start Here

1. `docs/master-spec.md`
2. `agentic-harness-framework/README.md`
3. `agentic-harness-framework/control-surfaces.md`
4. `docs/architecture/overview.md`
5. `docs/patterns/use-case.md`
6. `docs/patterns/api-handler.md`
7. `docs/patterns/safety-primitives.md`
8. `docs/testing/overview.md`
9. `docs/frontend/project-structure.md`
10. `docs/architecture/observability.md`
11. `docs/workflow.md`
12. `docs/workflow-memory/README.md`
13. `docs/architecture/effect-vs-nestjs.md`

## Directory Layout

- `docs/architecture/` - system boundaries, access control, observability
- `docs/patterns/` - backend implementation patterns and constraints
- `docs/frontend/` - frontend architecture and UI standards
- `docs/testing/` - testing strategy and required coverage by change type
- `agentic-harness-framework/` - repository operating model and control-surface map
- `docs/setup.md` - local development and test environment setup
- `docs/master-spec.md` - canonical, PR-governed master application specification
- `docs/workflow.md` - AI feature-delivery flow, scan cadence, and self-improvement loop
- `docs/workflow-memory/` - structured workflow memory system (events, index, summaries, guardrails)

## Debate Outcomes Applied

- Merged handler + serialization docs into `docs/patterns/api-handler.md`
- Replaced stale real-time guidance with current oRPC iterator pattern in `docs/frontend/real-time.md`
- Added architecture docs (`overview`, `access-control`, `observability`)
- Added `docs/testing/overview.md` matrix to map changes to required test types
- Kept enforcement annotations (`<!-- enforced-by: ... -->`) and Mermaid diagrams throughout

## Migration Notes

- Handler + serialization guidance is unified in `docs/patterns/api-handler.md`.
- Suspense guidance is consolidated into `docs/frontend/components.md`.
- Legacy standards paths have been retired; use `docs/...` for standards and `agentic-harness-framework/...` for control maps.
