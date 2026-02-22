# Performance + Cost Guard

- Memory key: `Performance + Cost Guard`
- Primary skill: [`performance-cost-guard`](../../../.agents/skills/performance-cost-guard/SKILL.md)

## What It Does

Detects and manages performance or cost regressions across frontend bundles, backend hot paths, CI runtime, and AI/provider spend.

## Trigger Skills

- `performance-cost-guard` (primary)
- Common companions: `periodic-scans`, `release-incident-response`

## Automation Entry Points

- No dedicated automation lane currently owns this workflow.
- Typically triggered during weekly scans, release readiness, and perf-sensitive delivery.

## How It Works

1. Establish recent known-good baselines.
2. Compare changed-surface impact (bundle output, runtime timings, telemetry trend snapshots).
3. Flag regressions with practical thresholds and user impact.
4. Prioritize fixes by impact-to-effort and decide block/accept/defer.

## Outputs

- Blocking and non-blocking regressions with confidence.
- Optimization quick wins and deferred opportunities.
- Memory entry with workflow `Performance + Cost Guard`.
