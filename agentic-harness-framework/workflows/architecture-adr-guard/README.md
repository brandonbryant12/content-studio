# Architecture + ADR Guard

- Memory key: `Architecture + ADR Guard`
- Primary skill: [`architecture-adr-guard`](../../../.agents/skills/architecture-adr-guard/SKILL.md)

## What It Does

Validates package boundaries, layer direction, runtime composition, authz placement, and observability expectations for architecture-impacting changes.

## Trigger Skills

- `architecture-adr-guard` (primary)
- Common companion: `feature-delivery`

## Automation Entry Points

- [`architecture-radar`](../../automations/architecture-radar/architecture-radar.md): discovers architecture improvements and opens approval-gated issues.
- [`architecture-approval-executor`](../../automations/architecture-approval-executor/architecture-approval-executor.md): executes approved architecture issues and enforces boundary-safe delivery.

## How It Works

1. Identify touched package boundaries and dependency direction.
2. Validate handler/use-case/repo separation and ownership checks.
3. Validate Effect layer construction (`Layer.succeed/sync/effect`) and runtime wiring.
4. Validate observability lifecycle and operational behavior.
5. If deviating intentionally, document ADR-lite rationale and follow-up enforcement.

## Outputs

- Findings by severity with file evidence.
- Approved deviations with rationale and follow-up guardrails.
- Memory entry with workflow `Architecture + ADR Guard`.
