---
name: content-studio-release-incident-response
description: Release readiness, canary/rollback, and incident response workflow with post-incident guardrail hardening.
---

# Content Studio Release + Incident Response

Use this skill for release trains, hotfixes, and production incidents.

## Release Readiness Flow

1. Confirm release scope and risk profile.
2. Run required validation gates for affected surfaces.
3. Verify migration/backfill and rollback compatibility.
4. Define canary checks and stop/rollback triggers.
5. Publish release notes with known risks.

## Incident Flow

1. Triage severity and user impact.
2. Stabilize first (rollback, feature flag, hotfix).
3. Identify root cause with evidence.
4. Patch and validate.
5. Run self-improvement loop to prevent recurrence.

## Rollback Triggers (Examples)

- repeated critical API failures
- auth/security regression
- queue/job failure spike with user-visible impact
- severe latency regression on core workflows

## Output Contract

1. Release decision (go/no-go)
2. Active risks and mitigations
3. Rollback plan and trigger thresholds
4. Incident postmortem summary (when applicable)
5. Required guardrail changes and owners

## Memory + Compounding

Record one structured memory event in `docs/workflow-memory/events/YYYY-MM.jsonl` with `workflow: "Release + Incident Response"` (prefer `node scripts/workflow-memory/add-entry.mjs`):

- release/incident signature
- fastest successful mitigation
- rollback trigger effectiveness
- follow-up guardrails landed
