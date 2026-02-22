# Feature Delivery

- Memory key: `Feature Delivery`
- Primary skill: [`feature-delivery`](../../../.agents/skills/feature-delivery/SKILL.md)

## What It Does

Runs the default request-to-merge delivery loop: plan slices, implement safely, validate, update docs, and compound learnings.

## Trigger Skills

- `feature-delivery` (primary)
- Common companions: `tanstack-vite`, `architecture-adr-guard`, `test-surface-steward`, `docs-knowledge-drift`

## Automation Entry Points

- [`architecture-approval-executor`](../../automations/architecture-approval-executor/architecture-approval-executor.md): implements approved architecture issues through full validation gates.
- [`self-improvement-judge-executor`](../../automations/self-improvement-judge-executor/self-improvement-judge-executor.md): implements selected self-improvement issues in bounded slices.

## How It Works

1. Plan 1-3 vertical slices and define tests before coding.
2. Implement one slice at a time with guardrails (authz, sanitization, typing, query keys, telemetry lifecycle).
3. Validate with targeted checks, then widen to repo gates.
4. Update docs when behavior or guardrails change.
5. Persist a memory event and include the event id in delivery notes.

## Outputs

- Shipped code, tests, and doc updates for the scoped slices.
- Validation evidence across required gates.
- Memory entry with workflow `Feature Delivery`.
