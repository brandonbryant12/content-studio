# Workflow Guardrails

This file records durable controls that were promoted from workflow learnings.

Use this format:

```md
## YYYY-MM-DD - <Guardrail Name>
- Source workflow:
- Problem signature:
- Control type: test | lint | docs rule | skill update | automation
- Change landed:
- Evidence:
- Owner:
- Status:
```

## Active Guardrails

## 2026-02-18 - Structured Workflow Memory Writes

- Source workflow: Self-Improvement
- Problem signature: Single markdown memory file causes retrieval/context bloat.
- Control type: automation + docs rule
- Change landed: `software-factory/scripts/workflow-memory/add-entry.mjs`, [`software-factory/workflow-memory/README.md`](./README.md), workflow protocol updates.
- Evidence: [`software-factory/workflow-memory/README.md`](./README.md), `software-factory/scripts/workflow-memory/add-entry.mjs`, [`software-factory/workflows/README.md`](../workflows/README.md)
- Owner: automation
- Status: active

## 2026-02-20 - Workflow Memory Coverage Audits

- Source workflow: Self-Improvement
- Problem signature: Workflow memory entries were structurally correct but sparse across active workflows.
- Control type: automation + docs rule + skill update
- Change landed: `software-factory/scripts/workflow-memory/check-coverage.mjs`, `package.json` workflow-memory scripts, skill/doc requirements for event id evidence and weekly coverage checks.
- Evidence: `software-factory/scripts/workflow-memory/check-coverage.mjs`, [`software-factory/workflow-memory/README.md`](./README.md), [`software-factory/workflows/README.md`](../workflows/README.md), [`.agents/skills/periodic-scans/SKILL.md`](../../.agents/skills/periodic-scans/SKILL.md)
- Owner: automation
- Status: active

## 2026-02-20 - Skill Quality Checks For Skill Drift

- Source workflow: Self-Improvement
- Problem signature: Skill content drift and stale path examples reduce reliability of skill-guided edits.
- Control type: automation + docs rule
- Change landed: `software-factory/scripts/skills/check-quality.mjs`, `skills:check:strict` command, workflow/docs updates requiring quality checks after skill edits.
- Evidence: `software-factory/scripts/skills/check-quality.mjs`, `package.json`, [`software-factory/workflows/README.md`](../workflows/README.md), [`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md)
- Owner: automation
- Status: active

## 2026-02-20 - Close Missing Workflow Coverage In-Loop

- Source workflow: Self-Improvement
- Problem signature: Quality closure loops can finish with `workflow-memory:coverage:strict` failures when monthly workflow classes have zero entries.
- Control type: docs rule
- Change landed: Require the active quality loop cycle to run lightweight passes for workflows reported missing by `pnpm workflow-memory:coverage:strict` and append those workflow events before final closure.
- Evidence: [`software-factory/workflows/README.md`](../workflows/README.md), [`software-factory/workflow-memory/guardrails.md`](./guardrails.md)
- Owner: automation
- Status: active

## 2026-02-22 - Workflow-Memory Taxonomy Enforcement

- Source workflow: Self-Improvement
- Problem signature: Memory and agent-failure events used inconsistent tags, reducing aggregation and retrieval quality.
- Control type: automation + docs rule + skill update
- Change landed: Added canonical taxonomy ([`software-factory/workflow-memory/taxonomy.md`](./taxonomy.md)), required taxonomy checklist in workflow docs, and add-entry validation/options for memory and capability/failure tags.
- Evidence: [`software-factory/workflow-memory/taxonomy.md`](./taxonomy.md), `software-factory/scripts/workflow-memory/add-entry.mjs`, [`software-factory/workflows/README.md`](../workflows/README.md), [`.agents/skills/periodic-scans/SKILL.md`](../../.agents/skills/periodic-scans/SKILL.md), [`.agents/skills/self-improvement/SKILL.md`](../../.agents/skills/self-improvement/SKILL.md)
- Owner: automation
- Status: active

## 2026-02-23 - Core Workflow Keys + Memory Taxonomy Audits

- Source workflow: Self-Improvement
- Problem signature: Workflow-memory coverage allowed utility skill keys and legacy memory events without taxonomy tags.
- Control type: automation + docs rule
- Change landed: `workflow-memory:coverage` now fails on unknown workflow keys in strict mode and can audit memory taxonomy tags; memory entries migrated to core workflow keys with `skill:*` tags.
- Evidence: `software-factory/scripts/workflow-memory/check-coverage.ts`, [`software-factory/workflow-memory/README.md`](./README.md), `software-factory/workflow-memory/events/2026-02.jsonl`, [`software-factory/workflow-memory/index.json`](./index.json)
- Owner: automation
- Status: active
