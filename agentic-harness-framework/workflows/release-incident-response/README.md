# Release + Incident Response

- Memory key: `Release + Incident Response`
- Primary skill: [`release-incident-response`](../../../.agents/skills/release-incident-response/SKILL.md)

## What It Does

Manages release readiness, canary/rollback criteria, and incident triage/hotfix handling with post-incident guardrail hardening.

## Trigger Skills

- `release-incident-response` (primary)
- Common companions: `security-dependency-hygiene`, `performance-cost-guard`, `self-improvement`

## Automation Entry Points

- No dedicated automation lane currently owns this workflow.
- Triggered for release trains, hotfixes, and production incidents.

## How It Works

1. Define release scope and risk profile.
2. Run surface-specific validation gates.
3. Verify migration/backfill/rollback compatibility.
4. Define canary checks and explicit stop/rollback triggers.
5. For incidents, stabilize first, find root cause, patch narrowly, and run recurrence prevention.

## Outputs

- Go/no-go release decision with risks and mitigations.
- Rollback plan with thresholds and incident postmortem actions.
- Memory entry with workflow `Release + Incident Response`.
