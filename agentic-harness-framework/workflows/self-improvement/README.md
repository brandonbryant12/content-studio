# Self-Improvement

- Memory key: `Self-Improvement`
- Primary skill: [`self-improvement`](../../../.agents/skills/self-improvement/SKILL.md)

## What It Does

Converts repeated failures, review feedback, and scan findings into stronger guardrails across tests, lint, docs, skills, and automation.

## Trigger Skills

- `self-improvement` (primary)
- Common companions: `periodic-scans`, `quality-closure-loop`, `docs-knowledge-drift`

## Automation Entry Points

- [`harness-research-radar`](../../automations/harness-research-radar/harness-research-radar.md): produces candidate self-improvement issues.
- [`self-improvement-judge-executor`](../../automations/self-improvement-judge-executor/self-improvement-judge-executor.md): selects and implements the highest-value self-improvement issue.
- [`quality-sentinel`](../../automations/quality-sentinel/quality-sentinel.md): feeds recurrence signals from closure loops.

## How It Works

1. Capture signals (CI failures, escaped defects, repeated review comments, scan findings, memory coverage gaps).
2. Classify root cause class (missing/ambiguous/unenforced/bypassed/noisy guardrails).
3. Patch the smallest effective prevention mechanism.
4. Validate fail-before/pass-after where possible.
5. Broadcast updates to shared instructions and sync skills when changed.
6. Persist a structured workflow-memory event.

## Outputs

- Root cause and guardrail patch summary.
- Validation evidence and broadcasted docs/skill updates.
- Memory entry with workflow `Self-Improvement`.
