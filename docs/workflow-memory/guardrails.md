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
- Change landed: `scripts/workflow-memory/add-entry.mjs`, `docs/workflow-memory/README.md`, workflow protocol updates.
- Evidence: `docs/workflow-memory/README.md`, `scripts/workflow-memory/add-entry.mjs`, `docs/workflow.md`
- Owner: brandon@ai-workflow
- Status: active

## 2026-02-20 - Workflow Memory Coverage Audits

- Source workflow: Self-Improvement
- Problem signature: Workflow memory entries were structurally correct but sparse across active workflows.
- Control type: automation + docs rule + skill update
- Change landed: `scripts/workflow-memory/check-coverage.mjs`, `package.json` workflow-memory scripts, skill/doc requirements for event id evidence and weekly coverage checks.
- Evidence: `scripts/workflow-memory/check-coverage.mjs`, `docs/workflow-memory/README.md`, `docs/workflow.md`, `.agents/skills/periodic-scans/SKILL.md`
- Owner: brandon@ai-workflow
- Status: active

## 2026-02-20 - Skill Quality Checks For Skill Drift

- Source workflow: Self-Improvement
- Problem signature: Skill content drift and stale path examples reduce reliability of skill-guided edits.
- Control type: automation + docs rule
- Change landed: `scripts/skills/check-quality.mjs`, `skills:check:strict` command, workflow/docs updates requiring quality checks after skill edits.
- Evidence: `scripts/skills/check-quality.mjs`, `package.json`, `docs/workflow.md`, `AGENTS.md`, `CLAUDE.md`
- Owner: brandon@ai-workflow
- Status: active

## 2026-02-20 - Close Missing Workflow Coverage In-Loop

- Source workflow: Self-Improvement
- Problem signature: Quality closure loops can finish with `workflow-memory:coverage:strict` failures when monthly workflow classes have zero entries.
- Control type: docs rule
- Change landed: Require the active quality loop cycle to run lightweight passes for workflows reported missing by `pnpm workflow-memory:coverage:strict` and append those workflow events before final closure.
- Evidence: `docs/workflow.md`, `docs/workflow-memory/guardrails.md`
- Owner: brandon@codex
- Status: active
