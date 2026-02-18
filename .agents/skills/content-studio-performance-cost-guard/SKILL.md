---
name: content-studio-performance-cost-guard
description: Performance and cost regression workflow for frontend bundles, backend hot paths, CI runtime, and AI/provider spend.
---

# Content Studio Performance + Cost Guard

Use this skill for performance-sensitive changes, weekly quality scans, and release readiness checks.

## Performance + Cost Surfaces

- route-level frontend bundles and load behavior
- backend hot paths and job throughput
- CI/test runtime and build time
- AI/provider usage patterns and token/call cost

## Guard Flow

1. Establish baseline from recent known-good runs.
2. Compare current change impact:
   - `pnpm --filter web build` output for bundle drift
   - targeted benchmark/test timings where applicable
   - telemetry trend snapshots for hot use cases/jobs
3. Flag regressions with practical thresholds and user impact.
4. Recommend fixes prioritized by impact-to-effort.
5. Record whether regression is blocked, accepted, or deferred.

## Output Contract

1. Blocking regressions
2. Non-blocking regressions
3. Optimization quick wins
4. Deferred opportunities with rationale

Include evidence source, confidence, and expected gain.

## Memory + Compounding

Record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "Performance + Cost Guard"` (prefer `node scripts/workflow-memory/add-entry.mjs`):

- baseline metric and new metric
- regression signature
- optimization applied or backlog decision
