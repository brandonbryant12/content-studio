---
name: quality-closure-loop
description: Runs a full scan-to-fix-to-guardrail cycle by chaining periodic scans, prioritized execution, and compounding prevention updates.
---

# Content Studio Quality Closure Loop

Use this when the request is "run the loop" or "scan and fix findings end-to-end."

## Loop Stages

1. Scan
2. Triage
3. Execute fixes
4. Prevent recurrence
5. Close and report

## 1) Scan

- Anchor to standards in `docs/workflow.md`, `docs/workflow-memory/README.md`, and `AGENTS.md`.
- Establish shell/toolchain context before running checks:
  - run Node/pnpm commands through interactive login zsh: `zsh -lic 'cd "$PWD" && <command>'`
  - verify toolchain first: `zsh -lic 'cd "$PWD" && node -v && pnpm -v && npm -v'`
  - require Node >= 22.10.0; if unmet, stop and report diagnostics (`echo $SHELL`, `which node`, `node -v`, `which pnpm`, `pnpm -v`, `which corepack`, `corepack --version`)
- Run minimum checks for the requested scope:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:invariants` for backend-touching scope
  - `pnpm --filter web build` for frontend-touching scope
  - `pnpm workflow-memory:coverage:strict`
- Capture findings in the required `periodic-scans` format from `.agents/skills/periodic-scans/SKILL.md`.

## 2) Triage Into Action Queue

For each finding assign:

- severity (`critical|high|medium|low`)
- impact and confidence
- owner
- execution workflow (`feature-delivery`, `pr-risk-review`, `test-surface-steward`, or `docs-knowledge-drift`)
- closure target (this cycle or deferred with reason)

Rules:

- fix all critical in the same cycle
- high must be fixed or explicitly deferred with owner and reason
- medium/low can be deferred only with concrete follow-up

## 3) Execute Fixes

- Run the selected workflow per finding.
- Keep edits vertical, test-backed, and behavior-preserving.
- Validate per item with targeted tests, then rerun broad gates at cycle end (using the same `zsh -lic` command pattern):
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:invariants` when backend changed
  - `pnpm --filter web build` when frontend changed

## 4) Prevent Recurrence

If a pattern appears in 2+ memory events in `docs/workflow-memory/index.json` or `docs/workflow-memory/events/YYYY-MM.jsonl`:

- run `self-improvement`
- land at least one guardrail (test, lint, docs rule, skill rule, or automation)
- validate fail-before/pass-after where possible
- update `AGENTS.md`, `CLAUDE.md`, and `docs/workflow.md` when standards change

## 5) Persist + Close

Record one memory event for each workflow actually used:

- `Periodic Scans`
- `Feature Delivery` / `PR Risk Review` / `Test Surface Steward` / `Docs + Knowledge Drift`
- `Self-Improvement` when recurrence prevention is triggered

Use `node scripts/workflow-memory/add-entry.mjs` and include event ids in delivery notes.

Re-run `pnpm workflow-memory:coverage:strict` before completion (via the same `zsh -lic` command pattern).

## Output Contract

1. Scan scope, commands run, and results
2. Prioritized findings with owner/workflow/closure target
3. Fixes shipped this cycle with validation evidence
4. Deferred findings with owner/reason/follow-up date
5. Guardrails added for repeated patterns
6. Workflow memory evidence (workflow -> event `id` list)

## Memory + Compounding

No standalone memory key for this orchestrator skill. Use concrete keys for each workflow run and report all event `id` values in final output.
