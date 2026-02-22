# Test Surface Steward

- Memory key: `Test Surface Steward`
- Primary skill: [`test-surface-steward`](../../../.agents/skills/test-surface-steward/SKILL.md)

## What It Does

Keeps test depth balanced across use-case, integration, workflow, invariant, frontend, and e2e layers as behavior changes.

## Trigger Skills

- `test-surface-steward` (primary)
- Common companions: `feature-delivery`, `pr-risk-review`, `debug-fix`

## Automation Entry Points

- [`quality-sentinel`](../../automations/quality-sentinel/quality-sentinel.md): may assign findings to this workflow during scan triage.

## How It Works

1. Classify changed behavior by surface (domain/API/worker/frontend).
2. Map required test types from testing docs.
3. Detect missing required tests, weak tests, and redundant tests.
4. Evaluate flake/runtime risk and propose minimal high-signal changes.

## Outputs

- Prioritized test recommendations with evidence and confidence gain.
- Validation command set for closure.
- Memory entry with workflow `Test Surface Steward`.
