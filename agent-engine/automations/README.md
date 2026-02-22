# Automations - Guardrails + Controlled Chaos

This directory documents how Codex automations are designed for this repo.

Goal:
- Keep all code changes aligned with repository guardrails in [`docs/`](../../docs/), [`AGENTS.md`](../../AGENTS.md), and [`CLAUDE.md`](../../CLAUDE.md).
- Continuously inject controlled external research ("chaos") to discover better patterns over time.

## Terminology

- `Workflow`: process contract and memory-key class (see [`agent-engine/workflows/README.md`](../workflows/README.md)).
- `Skill`: reusable execution method (see [`.agents/skills/`](../../.agents/skills/)).
- `Automation lane`: runtime orchestration policy that can trigger one or more workflows and skills.

Automations are not duplicates of workflows. They define runtime policy (triggering, approvals, branch/merge behavior, gate ordering) around workflow execution.

## Directory Structure

Each automation lane has its own folder:

- In [`agent-engine/automations/`](./), each lane folder contains a `<lane>.md` playbook.
- In [`agent-engine/automations/`](./), each lane folder contains a matching `<lane>.toml` runtime wrapper.

Example:

- [`agent-engine/automations/architecture-radar/architecture-radar.md`](./architecture-radar/architecture-radar.md)
- [`agent-engine/automations/architecture-radar/architecture-radar.toml`](./architecture-radar/architecture-radar.toml)

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
- Implements architecture/coding-pattern issues only after explicit human `ready-for-dev` label approval.
- Can conservatively bundle multiple small, tightly related `ready-for-dev` issues into one coherent PR when manageable in a single context.
- Branches from latest `origin/main`, runs core validation gates, and auto-merges on success.

3. `harness-research-radar`
- Research-only lane for agent harness and self-improvement loop design.
- Pulls outside research and compares against repo workflow/skills.
- Produces judge-ready self-improvement issues.

4. `self-improvement-judge-executor`
- Autonomous implementation lane for self-improvement issues.
- Uses a holistic judge to score all candidate suggestions and executes one coherent primary item, optionally aggregating closely related issues into a single PR.
- PR output must include linked aggregated issues plus a detailed improvements/benefits explanation, and include [`research/`](../../research/) documentation updates when external research ideas are adopted.
- Branches from latest `origin/main`, runs core validation gates, and opens PRs for human review/merge (no auto-merge in this lane).

## Lane Contract

For every lane:

- The `.md` playbook is source of truth for lane behavior.
- The `.toml` wrapper should only load and execute that playbook.
- If wrapper and playbook conflict, follow the playbook.

## Required Contract For Any Code-Writing Automation

Any automation that edits code must:

1. Read relevant repo standards before editing
- [`agent-engine/workflows/README.md`](../workflows/README.md)
- relevant files in [`docs/patterns/`](../../docs/patterns/)
- relevant files in [`docs/frontend/`](../../docs/frontend/) and [`docs/testing/`](../../docs/testing/) as needed

2. Branch from latest main
- `git fetch origin main`
- create branch from `origin/main`
- if only files in [`agent-engine/workflow-memory/events/`](../workflow-memory/events/) and/or [`agent-engine/workflow-memory/index.json`](../workflow-memory/index.json) are dirty, treat them as expected automation artifacts and continue (carry them into the branch; stash/re-apply only if checkout requires it)
- if any other unexpected dirty paths exist, stop and report blocker details

3. Prepare runtime for reliable automation execution
- run Node/pnpm commands via interactive login zsh (`zsh -lic 'cd <repo-root> && <command>'`) so automation uses the same shell toolchain as interactive development
- verify toolchain before install/gates: `zsh -lic 'cd <repo-root> && node -v && pnpm -v'` and require Node >= 22.10.0
- `pnpm install --frozen-lockfile --prefer-offline` (fast-path, fall back to online recovery on failure)
- `docker info --format '{{.ServerVersion}}'` (fast-path, fall back to context/socket diagnostics on failure)
- skip `pnpm test:e2e` in automation checklists (too slow/flaky for this lane)

4. Pass full gates before merge
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:invariants`
- `pnpm test`
- `pnpm build`

5. Use safe delivery behavior
- on failure: no merge, report blocker with evidence
- on success: open PR with issue linkage and follow lane-specific merge policy

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
- at most one PR per execution lane run; bundling multiple issues is allowed only when the bundle is small and coherent

6. Research traceability
- when an issue is based on external paper ideas, include paper links and adopted ideas in the issue
- when those ideas are implemented, append a shipped-entry log in [`research/implemented-ideas.md`](../../research/implemented-ideas.md)

## Flow Across Lanes

1. `architecture-radar` finds coding-pattern improvements.
2. Human approves selected issue by adding `ready-for-dev`.
3. `architecture-approval-executor` implements and merges after gates, usually one issue but optionally a small coherent multi-issue bundle in one PR.
4. `harness-research-radar` feeds self-improvement ideas/issues.
5. `self-improvement-judge-executor` selects the best holistic improvement, implements it, and opens a PR for human review/merge.

## Research Logging

When paper-derived ideas are adopted, log shipped changes in:
- [`research/implemented-ideas.md`](../../research/implemented-ideas.md)

Use the template in that file to record:
- paper link(s)
- adopted idea(s)
- issue/PR links
- concrete implementation summary

## Runtime Sync Commands

Push wrapper updates from repo mirror to local runtime:

```bash
cp agent-engine/automations/architecture-radar/architecture-radar.toml ~/.codex/automations/architecture-radar/automation.toml
cp agent-engine/automations/architecture-approval-executor/architecture-approval-executor.toml ~/.codex/automations/architecture-approval-executor/automation.toml
cp agent-engine/automations/harness-research-radar/harness-research-radar.toml ~/.codex/automations/harness-research-radar/automation.toml
cp agent-engine/automations/self-improvement-judge-executor/self-improvement-judge-executor.toml ~/.codex/automations/self-improvement-judge-executor/automation.toml
```

Pull runtime wrappers back into repo mirror (verification only):

```bash
cp ~/.codex/automations/architecture-radar/automation.toml agent-engine/automations/architecture-radar/architecture-radar.toml
cp ~/.codex/automations/architecture-approval-executor/automation.toml agent-engine/automations/architecture-approval-executor/architecture-approval-executor.toml
cp ~/.codex/automations/harness-research-radar/automation.toml agent-engine/automations/harness-research-radar/harness-research-radar.toml
cp ~/.codex/automations/self-improvement-judge-executor/automation.toml agent-engine/automations/self-improvement-judge-executor/self-improvement-judge-executor.toml
```
