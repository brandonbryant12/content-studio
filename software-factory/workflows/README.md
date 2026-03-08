<!-- GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Run `pnpm workflows:generate` to regenerate from registry.json. -->

# Workflow Catalog

Workflow, skill, and automation-lane reference for Content Studio.

Source of truth: [`software-factory/workflows/registry.json`](./registry.json)

## Terms

- `Workflow`: a documented development or maintenance flow with scope, expected outcome, and workflow-memory key.
- `Skill`: reusable execution instructions used within a workflow or helper task.
- `Automation lane`: a scheduled or event-driven wrapper that runs operations with lane-specific policies.

Start in `docs/` for product and code rules. Use this catalog to choose the workflow, skills, and lanes that fit the work.

## Core Workflows

Only core workflows own standalone workflow-memory keys.

| Workflow | Directory | Memory Key | Primary Skills | Automation Lanes | Intent |
|---|---|---|---|---|---|
| Feature Delivery | [`feature-delivery`](./feature-delivery/README.md) | `Feature Delivery` | [`feature-delivery`](../../.agents/skills/feature-delivery/SKILL.md) | [`ready-for-dev-executor`](../../automations/ready-for-dev-executor/ready-for-dev-executor.md), [`sanity-check`](../../automations/sanity-check/sanity-check.md) | Default workflow for scoped product, platform, and code changes. |
| Architecture + ADR Guard | [`architecture-adr-guard`](./architecture-adr-guard/README.md) | `Architecture + ADR Guard` | [`architecture-adr-guard`](../../.agents/skills/architecture-adr-guard/SKILL.md) | [`best-practice-researcher`](../../automations/best-practice-researcher/best-practice-researcher.md), [`ready-for-dev-executor`](../../automations/ready-for-dev-executor/ready-for-dev-executor.md), [`sanity-check`](../../automations/sanity-check/sanity-check.md) | Checks boundary/layer/runtime correctness and documents approved deviations. |
| Docs + Knowledge Drift | [`docs-knowledge-drift`](./docs-knowledge-drift/README.md) | `Docs + Knowledge Drift` | [`docs-knowledge-drift`](../../.agents/skills/docs-knowledge-drift/SKILL.md) | No dedicated lane | Keeps workflow/standards docs aligned with actual repository behavior. |
| Periodic Scans | [`periodic-scans`](./periodic-scans/README.md) | `Periodic Scans` | [`periodic-scans`](../../.agents/skills/periodic-scans/SKILL.md) | [`best-practice-researcher`](../../automations/best-practice-researcher/best-practice-researcher.md), [`software-factory-researcher`](../../automations/software-factory-researcher/software-factory-researcher.md), [`product-vision-researcher`](../../automations/product-vision-researcher/product-vision-researcher.md), [`product-owner-reviewer`](../../automations/product-owner-reviewer/product-owner-reviewer.md), [`issue-evaluator`](../../automations/issue-evaluator/issue-evaluator.md), [`sanity-check`](../../automations/sanity-check/sanity-check.md) | Runs recurring product, code, and workflow-quality checks and routes findings into follow-up work. |
| Self-Improvement | [`self-improvement`](./self-improvement/README.md) | `Self-Improvement` | [`self-improvement`](../../.agents/skills/self-improvement/SKILL.md) | [`software-factory-researcher`](../../automations/software-factory-researcher/software-factory-researcher.md), [`ready-for-dev-executor`](../../automations/ready-for-dev-executor/ready-for-dev-executor.md), [`sanity-check`](../../automations/sanity-check/sanity-check.md) | Maintains repository guardrails, workflow docs, skills, and automations after repeated failures or review feedback. |

## Utility Skills (Not Workflows)

These are reusable helper skills. They do not define standalone workflow classes.

| Utility Skill | Memory Key | Source Skill | Used With Workflows | Automation Lanes | Purpose |
|---|---|---|---|---|---|
| Intake + Triage | `Use parent workflow key` | [`intake-triage`](../../.agents/skills/intake-triage/SKILL.md) | `Feature Delivery`, `Architecture + ADR Guard`, `Self-Improvement` | [`ready-for-dev-executor`](../../automations/ready-for-dev-executor/ready-for-dev-executor.md), [`sanity-check`](../../automations/sanity-check/sanity-check.md) | Scopes requests into slices, acceptance criteria, and risk flags before implementation. |
| TanStack + Vite Guardrails | `Use parent workflow key` | [`tanstack-vite`](../../.agents/skills/tanstack-vite/SKILL.md) | `Feature Delivery`, `Architecture + ADR Guard`, `Self-Improvement` | No dedicated lane | Applies frontend data/routing/forms/build guardrails for apps/web. |
| Frontend Design | `Use parent workflow key` | [`frontend-design`](../../.agents/skills/frontend-design/SKILL.md) | `Feature Delivery`, `Architecture + ADR Guard`, `Self-Improvement` | No dedicated lane | Intentional UI design workflow for apps/web. |
| PR Risk Review | `Use parent workflow key` | [`pr-risk-review`](../../.agents/skills/pr-risk-review/SKILL.md) | `Feature Delivery`, `Architecture + ADR Guard`, `Self-Improvement` | No dedicated lane | Runs findings-first pre-merge risk review for regressions, safety, and contract drift. |
| Test Surface Steward | `Use parent workflow key` | [`test-surface-steward`](../../.agents/skills/test-surface-steward/SKILL.md) | `Feature Delivery`, `Periodic Scans`, `Self-Improvement` | No dedicated lane | Balances required test depth and reliability across backend, API, worker, and web. |
| Security + Dependency Hygiene | `Use parent workflow key` | [`security-dependency-hygiene`](../../.agents/skills/security-dependency-hygiene/SKILL.md) | `Periodic Scans`, `Feature Delivery`, `Self-Improvement` | No dedicated lane | Audits auth/data safety, secret handling, and dependency risk. |
| Performance + Cost Guard | `Use parent workflow key` | [`performance-cost-guard`](../../.agents/skills/performance-cost-guard/SKILL.md) | `Periodic Scans`, `Feature Delivery`, `Self-Improvement` | No dedicated lane | Detects and prioritizes performance and cost regressions. |
| Release + Incident Response | `Use parent workflow key` | [`release-incident-response`](../../.agents/skills/release-incident-response/SKILL.md) | `Feature Delivery`, `Periodic Scans`, `Self-Improvement` | No dedicated lane | Defines release go/no-go, canary/rollback thresholds, and incident handling loops. |
| Quality Closure Loop | `Uses workflow keys executed in-loop` | [`quality-closure-loop`](../../.agents/skills/quality-closure-loop/SKILL.md) | `Periodic Scans`, `Feature Delivery`, `Docs + Knowledge Drift`, `Self-Improvement`, `Architecture + ADR Guard` | No dedicated lane | Takes findings through triage, fixes, validation, and recurrence prevention. |
| Code Simplifier | `Use parent workflow key` | [`code-simplifier`](../../.agents/skills/code-simplifier/SKILL.md) | `Feature Delivery`, `Docs + Knowledge Drift`, `Self-Improvement`, `Architecture + ADR Guard` | No dedicated lane | Improves readability while preserving behavior and guardrail compliance. |
| Codebase Navigation | `Use parent workflow key` | [`codebase-nav`](../../.agents/skills/codebase-nav/SKILL.md) | `Feature Delivery`, `Architecture + ADR Guard`, `Docs + Knowledge Drift` | No dedicated lane | Locates canonical files and test targets quickly before implementation/review. |
| Debug + Fix | `Use parent workflow key` | [`debug-fix`](../../.agents/skills/debug-fix/SKILL.md) | `Feature Delivery`, `Periodic Scans`, `Self-Improvement`, `Architecture + ADR Guard` | [`ready-for-dev-executor`](../../automations/ready-for-dev-executor/ready-for-dev-executor.md), [`sanity-check`](../../automations/sanity-check/sanity-check.md) | Runs a test-driven reproduce -> isolate -> fix -> validate loop. |

## Usage

1. Pick the smallest core workflow set that satisfies the change.
2. Add utility skills only when they reduce risk or improve execution clarity.
3. Check the linked automation lanes when the work is scheduled, issue-driven, or queue-driven.
4. Persist workflow-memory notes using the core workflow key(s) that were actually executed.
