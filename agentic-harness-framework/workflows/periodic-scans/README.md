# Periodic Scans

- Memory key: `Periodic Scans`
- Primary skill: [`periodic-scans`](../../../.agents/skills/periodic-scans/SKILL.md)

## What It Does

Runs recurring per-PR, daily, weekly, and monthly quality scans to detect systemic risks and produce prioritized closure work.

## Trigger Skills

- `periodic-scans` (primary)
- Common companions: `quality-closure-loop`, `security-dependency-hygiene`, `performance-cost-guard`, `docs-knowledge-drift`

## Automation Entry Points

- [`quality-sentinel`](../../automations/quality-sentinel/quality-sentinel.md): executes recurring quality loops and closure.
- [`architecture-radar`](../../automations/architecture-radar/architecture-radar.md): continuous architecture research scan lane.
- [`harness-research-radar`](../../automations/harness-research-radar/harness-research-radar.md): continuous harness/self-improvement research scan lane.

## How It Works

1. Run cadence-specific checks (per-PR, daily, weekly, monthly/release).
2. Classify findings by severity, impact, effort, and confidence.
3. Add workflow-memory coverage checks and flag missing monthly workflow entries.
4. Route fixes to execution workflows and track closure status.

## Outputs

- Prioritized scan report plus closure recommendations.
- Workflow-memory coverage snapshot.
- Memory entry with workflow `Periodic Scans`.
