# Periodic Scans

- Memory key: `Periodic Scans`
- Primary skill: [`periodic-scans`](../../../.agents/skills/periodic-scans/SKILL.md)

## What It Does

Runs recurring checks on product quality, code health, docs, and workflow
tooling, then routes findings into concrete follow-up work.

## Workflow Skills

- `periodic-scans` (primary)
- Common companions: `quality-closure-loop`, `security-dependency-hygiene`, `performance-cost-guard`, `docs-knowledge-drift`

## Automation Entry Points

- [`best-practice-researcher`](../../../automations/best-practice-researcher/best-practice-researcher.md): opens issues for architecture, testing, and implementation best-practice gaps.
- [`software-factory-researcher`](../../../automations/software-factory-researcher/software-factory-researcher.md): opens issues for workflow, automation, and related documentation/tooling gaps.
- [`product-vision-researcher`](../../../automations/product-vision-researcher/product-vision-researcher.md): turns longer-horizon product opportunities into `product-vision` issues.
- [`product-owner-reviewer`](../../../automations/product-owner-reviewer/product-owner-reviewer.md): reviews day-to-day UX flows and opens tactical product improvements.
- [`issue-evaluator`](../../../automations/issue-evaluator/issue-evaluator.md): labels open issues as `ready-for-dev`, `human-eval-needed`, or `rejected` using a strict readiness rubric.
- [`sanity-check`](../../../automations/sanity-check/sanity-check.md): runs bounded follow-up fixes that can be validated and merged safely.

## How It Works

1. Run cadence-specific checks (per-PR, daily, weekly, monthly/release).
2. Classify findings by severity, impact, effort, and confidence.
3. Check workflow-memory coverage and flag missing review/maintenance follow-up where required.
4. Route fixes to feature delivery, docs updates, or workflow maintenance and track closure status.

## Outputs

- Prioritized scan report plus closure recommendations.
- Workflow-memory coverage snapshot.
- Memory entry with workflow `Periodic Scans`.
