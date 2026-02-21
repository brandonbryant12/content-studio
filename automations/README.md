# Automations - Guardrails + Controlled Chaos

This directory documents how Codex automations are designed for this repo.

Goal:
- Keep all code changes aligned with repository guardrails in `docs/`, `AGENTS.md`, and `CLAUDE.md`.
- Continuously inject controlled external research ("chaos") to discover better patterns over time.

Runtime configs are executed from local Codex config:
- `~/.codex/automations/*/automation.toml`

This repo directory is the version-control mirror and design record.

## Operating Model

We run two complementary forces:

1. Guardrail enforcement lanes (execution lanes)
- Only implement changes when guardrails are satisfied.
- Use deterministic branching and test gates.
- Merge only after full validation.

2. Controlled chaos lanes (research lanes)
- Continuously research outside practices and recent docs.
- Generate proposals/issues that challenge current patterns.
- Feed only high-signal, coherent ideas into execution lanes.

This creates stability plus adaptation:
- Guardrails prevent regressions.
- Chaos research prevents stagnation.

## Active Lanes

1. `architecture-radar`
- Research-only lane for coding patterns, architecture, and engineering practices.
- Creates/updates architecture issues with evidence and acceptance criteria.
- No direct code changes.

2. `architecture-approval-executor`
- Human-in-the-loop coding lane.
- Implements architecture/coding-pattern issues only after explicit human thumbs-up approval signal.
- Branches from latest `origin/main`, runs full validation including `pnpm test:e2e`, and auto-merges on success.

3. `harness-research-radar`
- Research-only lane for agent harness and self-improvement loop design.
- Pulls outside research and compares against repo workflow/skills.
- Produces judge-ready self-improvement issues.

4. `self-improvement-judge-executor`
- Autonomous implementation lane for self-improvement issues.
- Uses a holistic judge to score all candidate suggestions and executes only the best coherent item.
- Branches from latest `origin/main`, runs full validation including `pnpm test:e2e`, and auto-merges on success.

5. `quality-sentinel`
- Quality scan + issue feeder lane.
- Runs full checks and converts failures into scoped self-improvement issues.
- No direct code changes.

## Required Contract For Any Code-Writing Automation

Any automation that edits code must:

1. Read relevant repo standards before editing
- `docs/workflow.md`
- relevant `docs/patterns/*.md`
- relevant `docs/frontend/*.md` and `docs/testing/*.md` as needed

2. Branch from latest main
- `git fetch origin main`
- create branch from `origin/main`

3. Prepare runtime for reliable e2e execution
- ensure supported Node runtime
- `pnpm install --frozen-lockfile`
- `docker info`
- `pnpm test:db:setup` (Testcontainers/local DB prerequisites)

4. Pass full gates before merge
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:invariants`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`

5. Use safe delivery behavior
- on failure: no merge, report blocker with evidence
- on success: open PR with issue linkage, auto-merge, verify issue closure

## Controlled Chaos Rules

External research is encouraged, but only through filters:

1. Evidence quality
- prioritize primary/official sources and recent release notes

2. System coherence
- proposed change must fit repo architecture, skills, and workflow memory

3. Material impact
- reject ideas that add complexity without clear system-level benefit

4. Non-duplication
- reuse existing issues/PRs when possible

5. Bounded execution
- at most one implementation slice per execution lane run

6. Research traceability
- when an issue is based on external paper ideas, include paper links and adopted ideas in the issue
- when those ideas are implemented, append a shipped-entry log in `research/implemented-ideas.md`

## Flow Across Lanes

1. `architecture-radar` finds coding-pattern improvements.
2. Human approves selected issue.
3. `architecture-approval-executor` implements and merges after gates.
4. `harness-research-radar` and `quality-sentinel` feed self-improvement ideas/issues.
5. `self-improvement-judge-executor` selects the best holistic improvement and merges after gates.

## Research Logging

When paper-derived ideas are adopted, log shipped changes in:
- `research/implemented-ideas.md`

Use the template in that file to record:
- paper link(s)
- adopted idea(s)
- issue/PR links
- concrete implementation summary

## Version-Control Mirror

Automation TOMLs are mirrored in:
- `automations/codex-app/*/automation.toml`

Lane-specific details and sync commands live in:
- `automations/codex-app/README.md`
