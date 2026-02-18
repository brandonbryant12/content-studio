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
- Owner: @ai-workflow
- Status: active
