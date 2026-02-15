# Engineering Standards Docs

This directory is the standards source of record, built from the multi-agent debate outputs in:

- `scripts/standards-debate/workspace/synthesis.md`
- `scripts/standards-debate/workspace/improved/`

All new code reviews and feature work should reference `docs/` paths.

## Start Here

1. `docs/architecture/overview.md`
2. `docs/patterns/use-case.md`
3. `docs/patterns/api-handler.md`
4. `docs/patterns/safety-primitives.md`
5. `docs/testing/overview.md`
6. `docs/frontend/project-structure.md`

## Directory Layout

- `docs/architecture/` - system boundaries, access control, observability
- `docs/patterns/` - backend implementation patterns and constraints
- `docs/frontend/` - frontend architecture and UI standards
- `docs/testing/` - testing strategy and required coverage by change type
- `docs/setup.md` - local development and test environment setup
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
