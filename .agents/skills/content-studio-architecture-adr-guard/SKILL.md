---
name: content-studio-architecture-adr-guard
description: Architecture boundary and ADR guard workflow for validating design changes against documented system constraints.
---

# Content Studio Architecture + ADR Guard

Use this skill when a change may cross package boundaries, layer rules, or core runtime patterns.

## Standards To Check

- `docs/architecture/overview.md`
- `docs/architecture/access-control.md`
- `docs/architecture/observability.md`
- `docs/patterns/use-case.md`
- `docs/patterns/repository.md`
- `docs/patterns/api-handler.md`
- `docs/patterns/effect-runtime.md`

## Guard Flow

1. Identify touched packages and layer boundaries.
2. Validate ownership rules and dependency direction.
3. Validate handler/use-case/repo separation.
4. Validate authn/authz placement and denial semantics.
5. Validate effect layer construction rules (`Layer.succeed/sync/effect`).
6. Validate observability expectations for changed use cases.

## Exception Protocol (ADR-lite)

If a change intentionally deviates from current standards:

1. Document the deviation in `docs/debate-decisions.md`.
2. Include:
   - context
   - decision
   - rationale
   - risks
   - sunset/reevaluation trigger
3. Add at least one enforcement follow-up (test, lint rule, docs rule, or skill update).

## Output Contract

Report in this order:

1. Blocking violations (must-fix)
2. Non-blocking risks
3. Approved deviations with rationale
4. Enforcement follow-ups

Each finding must include severity, file evidence, and suggested fix.

## Memory + Compounding

Record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "Architecture + ADR Guard"` (prefer `node scripts/workflow-memory/add-entry.mjs`):

- repeated boundary violation pattern
- accepted exception and why
- guardrail added to prevent recurrence
