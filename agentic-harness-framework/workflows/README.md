<!-- GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Run `pnpm workflows:generate` to regenerate from registry.json. -->

# Workflow Catalog

Canonical workflow catalog for Content Studio.

Source of truth: [`agentic-harness-framework/workflows/registry.json`](./registry.json)

## Concepts

- `Workflow`: A process contract that defines scope, expected outcome, and workflow-memory key.
- `Skill`: A reusable execution method that implements one part of a workflow (or a helper task).
- `Automation`: A runtime lane (scheduled or event-driven) that can trigger one or more workflows and skills with lane-specific policies.

Not every workflow has an automation lane, and not every automation lane maps 1:1 to one workflow.

## Core Workflows

Core workflows are the only entries with first-class workflow memory keys.

| Workflow | Directory | Memory Key | Primary Skills | Automation Triggers | Intent |
|---|---|---|---|---|---|
| Intake + Triage | [`intake-triage`](./intake-triage/README.md) | `Intake + Triage` | [`intake-triage`](../../.agents/skills/intake-triage/SKILL.md) | [`architecture-approval-executor`](../automations/architecture-approval-executor/architecture-approval-executor.md), [`self-improvement-judge-executor`](../automations/self-improvement-judge-executor/self-improvement-judge-executor.md) | Scopes requests into slices, acceptance criteria, and risk flags before implementation. |
| Feature Delivery | [`feature-delivery`](./feature-delivery/README.md) | `Feature Delivery` | [`feature-delivery`](../../.agents/skills/feature-delivery/SKILL.md) | [`architecture-approval-executor`](../automations/architecture-approval-executor/architecture-approval-executor.md), [`self-improvement-judge-executor`](../automations/self-improvement-judge-executor/self-improvement-judge-executor.md), [`quality-sentinel`](../automations/quality-sentinel/quality-sentinel.md) | Executes plan -> implement -> validate -> compound for vertical delivery slices. |
| TanStack + Vite Guardrails | [`tanstack-vite`](./tanstack-vite/README.md) | `TanStack + Vite` | [`tanstack-vite`](../../.agents/skills/tanstack-vite/SKILL.md) | No dedicated lane | Applies frontend data/routing/forms/build guardrails for apps/web. |
| Architecture + ADR Guard | [`architecture-adr-guard`](./architecture-adr-guard/README.md) | `Architecture + ADR Guard` | [`architecture-adr-guard`](../../.agents/skills/architecture-adr-guard/SKILL.md) | [`architecture-radar`](../automations/architecture-radar/architecture-radar.md), [`architecture-approval-executor`](../automations/architecture-approval-executor/architecture-approval-executor.md) | Checks boundary/layer/runtime correctness and documents approved deviations. |
| PR Risk Review | [`pr-risk-review`](./pr-risk-review/README.md) | `PR Risk Review` | [`pr-risk-review`](../../.agents/skills/pr-risk-review/SKILL.md) | No dedicated lane | Findings-first pre-merge risk review for regressions, safety, and contract drift. |
| Test Surface Steward | [`test-surface-steward`](./test-surface-steward/README.md) | `Test Surface Steward` | [`test-surface-steward`](../../.agents/skills/test-surface-steward/SKILL.md) | [`quality-sentinel`](../automations/quality-sentinel/quality-sentinel.md) | Balances required test depth and reliability across backend, API, worker, and web. |
| Security + Dependency Hygiene | [`security-dependency-hygiene`](./security-dependency-hygiene/README.md) | `Security + Dependency Hygiene` | [`security-dependency-hygiene`](../../.agents/skills/security-dependency-hygiene/SKILL.md) | No dedicated lane | Audits auth/data safety, secret handling, and dependency risk. |
| Performance + Cost Guard | [`performance-cost-guard`](./performance-cost-guard/README.md) | `Performance + Cost Guard` | [`performance-cost-guard`](../../.agents/skills/performance-cost-guard/SKILL.md) | No dedicated lane | Detects and prioritizes performance and cost regressions. |
| Docs + Knowledge Drift | [`docs-knowledge-drift`](./docs-knowledge-drift/README.md) | `Docs + Knowledge Drift` | [`docs-knowledge-drift`](../../.agents/skills/docs-knowledge-drift/SKILL.md) | [`quality-sentinel`](../automations/quality-sentinel/quality-sentinel.md) | Keeps workflow/standards docs aligned with actual repository behavior. |
| Periodic Scans | [`periodic-scans`](./periodic-scans/README.md) | `Periodic Scans` | [`periodic-scans`](../../.agents/skills/periodic-scans/SKILL.md) | [`quality-sentinel`](../automations/quality-sentinel/quality-sentinel.md), [`architecture-radar`](../automations/architecture-radar/architecture-radar.md), [`harness-research-radar`](../automations/harness-research-radar/harness-research-radar.md) | Runs recurring quality scans and routes findings into closure workflows. |
| Release + Incident Response | [`release-incident-response`](./release-incident-response/README.md) | `Release + Incident Response` | [`release-incident-response`](../../.agents/skills/release-incident-response/SKILL.md) | No dedicated lane | Defines release go/no-go, canary/rollback thresholds, and incident handling loops. |
| Self-Improvement | [`self-improvement`](./self-improvement/README.md) | `Self-Improvement` | [`self-improvement`](../../.agents/skills/self-improvement/SKILL.md) | [`harness-research-radar`](../automations/harness-research-radar/harness-research-radar.md), [`self-improvement-judge-executor`](../automations/self-improvement-judge-executor/self-improvement-judge-executor.md), [`quality-sentinel`](../automations/quality-sentinel/quality-sentinel.md) | Converts repeated failures into stronger guardrails, tests, docs, and automation rules. |

## Utility Skills (Not Workflows)

These are reusable helper/orchestrator skills. They do not define standalone workflow classes.

| Utility Skill | Memory Key | Source Skill | Used With Workflows | Automation Triggers | Purpose |
|---|---|---|---|---|---|
| Quality Closure Loop | `Uses workflow keys executed in-loop` | [`quality-closure-loop`](../../.agents/skills/quality-closure-loop/SKILL.md) | `Periodic Scans`, `Feature Delivery`, `PR Risk Review`, `Test Surface Steward`, `Docs + Knowledge Drift`, `Self-Improvement` | [`quality-sentinel`](../automations/quality-sentinel/quality-sentinel.md) | Orchestrates scan -> triage -> fixes -> recurrence prevention -> closure. |
| Code Simplifier | `Use parent workflow key` | [`code-simplifier`](../../.agents/skills/code-simplifier/SKILL.md) | `Feature Delivery`, `PR Risk Review`, `Self-Improvement`, `Periodic Scans` | No dedicated lane | Improves readability while preserving behavior and guardrail compliance. |
| Codebase Navigation | `Use parent workflow key` | [`codebase-nav`](../../.agents/skills/codebase-nav/SKILL.md) | `Intake + Triage`, `Feature Delivery`, `PR Risk Review` | No dedicated lane | Locates canonical files and test targets quickly before implementation/review. |
| Debug + Fix | `Use parent workflow key` | [`debug-fix`](../../.agents/skills/debug-fix/SKILL.md) | `Feature Delivery`, `Test Surface Steward`, `Self-Improvement`, `Periodic Scans` | [`quality-sentinel`](../automations/quality-sentinel/quality-sentinel.md), [`architecture-approval-executor`](../automations/architecture-approval-executor/architecture-approval-executor.md), [`self-improvement-judge-executor`](../automations/self-improvement-judge-executor/self-improvement-judge-executor.md) | Runs a test-driven reproduce -> isolate -> fix -> validate loop. |

## Usage

1. Pick the smallest core workflow set that satisfies the change.
2. Add utility skills only when they reduce risk or improve execution clarity.
3. Persist workflow-memory notes using the core workflow key(s) that were actually executed.
