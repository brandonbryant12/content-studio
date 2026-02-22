# Agentic Harness Framework

This folder is a high-level map of the controls used to keep Content Studio changes predictable and safe.
It sits above detailed standards docs and explains how specs, skills, gates, and learning loops work together.

## Core Controls

| Control | Purpose | Source Of Truth |
|---|---|---|
| Behavior specs | Define expected product behavior before implementation | `docs/master-spec.md`, `docs/spec/generated/*` |
| Engineering standards | Constrain architecture, backend, frontend, and tests | `docs/architecture/*`, `docs/patterns/*`, `docs/frontend/*`, `docs/testing/*` |
| Skill workflows | Standardize how work is scoped, delivered, reviewed, and improved | `.agents/skills/*/SKILL.md`, `docs/workflow.md` |
| Automation lanes | Capture scheduled lane playbooks and runtime wrappers | `agentic-harness-framework/automations/*/*.md`, `agentic-harness-framework/automations/*/*.toml` |
| Automated quality gates | Catch drift and regressions before merge | `pnpm spec:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:invariants`, `pnpm build` |
| Human review controls | Cover risks that automation cannot fully judge | PR review + `pr-risk-review`, `architecture-adr-guard` |
| Workflow memory | Persist findings and improve guardrails over time | `docs/workflow-memory/*` |

## Delivery Loop

1. Intake and triage the request.
2. Align intended behavior with specs and standards.
3. Implement with the smallest relevant workflow skills.
4. Run required quality gates.
5. Review risk and merge with evidence.
6. Record workflow memory and feed periodic/self-improvement loops.

## Next Read

1. `agentic-harness-framework/framework-map.md`
2. `agentic-harness-framework/control-surfaces.md`
3. `agentic-harness-framework/automations/README.md`
4. `docs/workflow.md`
5. `docs/workflow-memory/README.md`
