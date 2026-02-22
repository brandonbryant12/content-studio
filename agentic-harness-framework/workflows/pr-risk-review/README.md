# PR Risk Review

- Memory key: `PR Risk Review`
- Primary skill: [`pr-risk-review`](../../../.agents/skills/pr-risk-review/SKILL.md)

## What It Does

Runs a findings-first pre-merge review focused on regressions, authorization/data safety, contract compatibility, and missing test evidence.

## Trigger Skills

- `pr-risk-review` (primary)
- Common companion: `test-surface-steward`

## Automation Entry Points

- No dedicated automation lane runs this workflow as a standalone stage.
- It is invoked in manual pre-merge review and can be selected by quality closure triage for high-risk findings.

## How It Works

1. Map changed files to risk categories.
2. Check must-not-regress rules (auth before writes, sanitization, query keys, stream typing/state, retry policy, telemetry lifecycle).
3. Validate evidence with targeted tests, then widen when necessary.
4. Emit findings ordered by severity with minimal fix paths.

## Outputs

- Findings-first risk report and merge recommendation.
- Memory entry with workflow `PR Risk Review`.
