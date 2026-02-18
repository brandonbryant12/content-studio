# Engineering Standards Docs

This directory is the standards source of record, built from the multi-agent debate outputs in:

- `scripts/standards-debate/workspace/synthesis.md`
- `scripts/standards-debate/workspace/improved/`

These standards are part of an experimental technique called **Agent Harnessing**:
steering AI-authored changes with explicit docs, skills, and automated checks.
Treat this operating model as experimental and expected to evolve.

All new code reviews and feature work should reference `docs/` paths.

## Start Here

1. `docs/master-spec.md`
2. `docs/architecture/overview.md`
3. `docs/patterns/use-case.md`
4. `docs/patterns/api-handler.md`
5. `docs/patterns/safety-primitives.md`
6. `docs/testing/overview.md`
7. `docs/frontend/project-structure.md`
8. `docs/architecture/observability.md`
9. `docs/workflow.md`
10. `docs/workflow-memory/README.md`
11. `docs/architecture/effect-vs-nestjs.md`

## Directory Layout

- `docs/architecture/` - system boundaries, access control, observability
- `docs/patterns/` - backend implementation patterns and constraints
- `docs/frontend/` - frontend architecture and UI standards
- `docs/testing/` - testing strategy and required coverage by change type
- `docs/setup.md` - local development and test environment setup
- `docs/master-spec.md` - canonical, PR-governed master application specification
- `docs/workflow.md` - AI feature-delivery flow, scan cadence, and self-improvement loop
- `docs/workflow-memory/` - structured workflow memory system (events, index, summaries, guardrails)
- `docs/debate-decisions.md` - resolved debate decisions and open follow-ups

## Debate Outcomes Applied

- Merged handler + serialization docs into `docs/patterns/api-handler.md`
- Replaced stale real-time guidance with current oRPC iterator pattern in `docs/frontend/real-time.md`
- Added architecture docs (`overview`, `access-control`, `observability`)
- Added `docs/testing/overview.md` matrix to map changes to required test types
- Kept enforcement annotations (`<!-- enforced-by: ... -->`) and Mermaid diagrams throughout

## Migration Notes

- Handler + serialization guidance is unified in `docs/patterns/api-handler.md`.
- Suspense guidance is consolidated into `docs/frontend/components.md`.
- Legacy standards paths have been retired; use only `docs/...` references going forward.
