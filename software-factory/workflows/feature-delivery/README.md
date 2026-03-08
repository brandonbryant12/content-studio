# Feature Delivery

- Memory key: `Feature Delivery`
- Primary skill: [`feature-delivery`](../../../.agents/skills/feature-delivery/SKILL.md)

## What It Does

Default workflow for product, API, worker, and web changes. Use it for scoped
features, behavior changes, and straightforward refactors.

## Workflow Skills

- `feature-delivery` (primary)
- Common companions: `tanstack-vite`, `architecture-adr-guard`, `test-surface-steward`, `docs-knowledge-drift`

## Automation Entry Points

- [`ready-for-dev-executor`](../../../automations/ready-for-dev-executor/ready-for-dev-executor.md): implements approved `ready-for-dev` issues through full validation gates.
- [`sanity-check`](../../../automations/sanity-check/sanity-check.md): periodically scans and directly ships bounded high-confidence fixes through full validation gates.

## How It Works

1. Plan 1-3 vertical slices and define tests before coding.
2. Implement one slice at a time with guardrails (authz, sanitization, typing, query keys, telemetry lifecycle).
3. Validate with targeted checks, then widen to repo gates.
4. Update docs when behavior or guardrails change.
5. Record the workflow-memory note required by the workflow and include the event id in delivery notes.

## Outputs

- Shipped code, tests, and doc updates for the scoped slices.
- Validation evidence across required gates.
- Memory entry with workflow `Feature Delivery`.
