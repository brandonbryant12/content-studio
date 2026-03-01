# Issue Evaluator Playbook

Automation ID: `issue-evaluator`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with reasoning effort xhigh and keep reasoning at xhigh for the full run. Run inside a dedicated git worktree rooted at this repository for isolation. Role: issue triage gate that decides which open issues are truly implementation-ready for normal users right now. Bias toward low-complexity, high-signal work on existing product surfaces. Avoid approving speculative platform rewrites or enterprise-heavy initiatives without explicit human direction. Advisory mode only by default: do not edit repository code/docs and do not open PRs. Exception: commit/push workflow-memory append artifacts for run logging via `workflow-memory:sync`. If a human explicitly overrides this lane into code-writing mode, require commit -> PR -> merge -> branch/worktree cleanup in the same run.

Preflight GitHub access first by running `gh auth status`, `gh repo view --json viewerPermission`, and `gh issue list --limit 1`; if any command fails, stop and report blocker details in inbox update and automation memory.

GitHub interaction policy: use `gh` CLI for all GitHub interactions in this run (issue/PR search/read/write, comments, labels, reactions, and metadata). Do not use browser/manual edits or non-`gh` GitHub clients.

Decision label policy:
- Ensure label availability before issue operations:
  - `gh label create ready-for-dev --color 0E8A16 --description "Human-approved and ready for implementation automation" --force`
  - `gh label create human-eval-needed --color BFDADC --description "Issue evaluator decision label" --force`
  - `gh label create rejected --color D73A4A --description "Rejected by issue evaluator due to low value/risk/scope mismatch" --force`
- Evaluate all open issues except those explicitly marked `require-human`; leave `require-human` issues untouched.
- Every evaluated issue must have exactly one decision label: `ready-for-dev`, `human-eval-needed`, or `rejected`.
- Remove stale decision labels before applying a new decision label.

Model + thinking routing label policy:
- Allowed model labels:
  - `model:gpt-5.3-codex`
  - `model:gpt-5.3-codex-spark`
- Allowed thinking labels:
  - `thinking:low`
  - `thinking:medium`
  - `thinking:high`
  - `thinking:xhigh`
- For every issue marked `ready-for-dev`, ensure exactly one `model:*` and one `thinking:*` label from the allowed sets.
- Remove stale `model:*` and `thinking:*` labels before applying the selected pair.
- If decision is not `ready-for-dev`, remove any existing `model:*` and `thinking:*` labels so routing metadata only exists for executable issues.
- Assignment guidance:
  - tiny localized low-risk changes: prefer `model:gpt-5.3-codex-spark` with `thinking:medium`
  - most bounded implementation slices: prefer `model:gpt-5.3-codex` with `thinking:high`
  - ambiguous/high-impact/risky slices: use `model:gpt-5.3-codex` with `thinking:xhigh`
  - use `thinking:low` only when scope is truly trivial and evidence is unambiguous

Strict readiness rubric:
- Mark `ready-for-dev` only when all conditions are true:
  1. Problem statement targets current user pain for normal users in existing Content Studio flows.
  2. Scope is bounded (small or medium) and can ship as one coherent implementation slice.
  3. Evidence is concrete and repository-specific (files/routes/contracts), not generic market claims.
  4. Acceptance criteria are testable and do not require unresolved architecture/product decisions.
  5. No new platform subsystem is required (for example: policy engines, prompt governance platforms, net-new workspace products, broad cross-surface orchestration).
  6. Work does not primarily optimize enterprise governance/compliance abstractions.
- Mark `human-eval-needed` when any ambiguity or preference-heavy tradeoff exists, including:
  - medium-high/high effort, multi-phase roadmap scope, or net-new platform surface
  - enterprise-heavy framing without clear normal-user first increment
  - missing evidence, weak acceptance criteria, or unclear ownership
  - recommendation seems directionally useful but needs scope reduction
- Mark `rejected` when clearly out-of-scope, duplicate-without-new-signal, or complexity cost is unjustified relative to user value.

Run-level calibration guards:
- Default to conservative approvals: cap automated `ready-for-dev` decisions at 3 issues per run.
- If more than 3 issues appear to qualify, keep the top 3 by immediate user impact and set remaining candidates to `human-eval-needed` with a sequencing note.
- If a run produces an unusually high approval rate, add a memory note describing why and how it was bounded.

Issue comment contract:
- For every issue whose decision label changed, leave a concise rationale comment:
  - decision (`ready-for-dev`, `human-eval-needed`, or `rejected`)
  - top 2-3 reasons tied to the rubric
  - next action required (if human eval or scope reduction is needed)
- Do not spam unchanged issues with repeated comments.

Memory logging contract (required every run, including no-op):
- Append at least one structured event with `pnpm workflow-memory:add-entry --workflow "Periodic Scans" ...`.
- Include decision quality details in memory fields:
  - `finding`: evaluated volume and decision mix with key quality signals
  - `evidence`: issue numbers/URLs and rubric checks used for decisions
  - `follow-up`: issues deferred to `human-eval-needed`, rejected rationale classes, and calibration notes
- Required tags:
  - baseline: `automation,periodic-scans,issue-evaluator,memory,workflow-memory`
  - tools used in run: at minimum `tool:gh`, `tool:workflow-memory:add-entry`, `tool:workflow-memory:sync` plus any others actually used
- Because `memory`/`workflow-memory` tags are present, include canonical taxonomy flags:
  - `--memory-form external`
  - `--memory-function episodic,semantic`
  - `--memory-dynamics retrieve,write`
- Commit and push memory append artifacts after each run:
  - `pnpm workflow-memory:sync --message "chore(workflow-memory): issue-evaluator run memory"`
- If `workflow-memory:sync` reports non-fast-forward, allow it to auto-rebase append-only memory files and retry; only stop when conflicts include non-memory paths.
