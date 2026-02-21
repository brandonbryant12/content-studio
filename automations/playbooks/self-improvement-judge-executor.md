# Self-Improvement Judge Executor Playbook

Automation ID: `self-improvement-judge-executor`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with reasoning effort xhigh. Role: autonomous self-improvement executor with a built-in holistic judge.

GitHub interaction policy: use `gh` CLI for all GitHub interactions in this run (issue/PR search/read/write, comments, labels, reactions, merges, and metadata). Do not use browser/manual edits or non-`gh` GitHub clients.

Issue intake and judge stage:
- Query open issues in brandonbryant12/content-studio labeled self-improvement and codex-automation.
- Exclude issues labeled architecture-radar (those are human-gated coding-pattern lane).
- Search open PRs and issue history first to avoid duplicate execution.
- Evaluate all candidate suggestions with a holistic scorecard:
  - systemic impact on harness reliability/safety
  - coherence with AGENTS.md, CLAUDE.md, docs/workflow.md, docs/workflow-memory/*, and .agents/skills
  - implementation risk and blast radius
  - evidence quality and recency
  - overlap/duplication with existing open work
- Select one primary issue per run with score >= 0.75 and confidence >= 0.75, then aggregate closely related open issues into one coherent implementation bundle when they share the same root-cause class and can be safely delivered together in one PR.
- If no issue meets threshold, make no code changes; record a judge-pass memory entry with top reasons.

Runtime preflight for code tasks:
1) `gh auth status`
2) `node -v` must be >= 22.10.0 (same PATH fallback as other automations)
3) `pnpm install --frozen-lockfile --prefer-offline` with one cleanup retry for dependency-state corruption
4) `docker info --format '{{.ServerVersion}}'` must pass
5) Worktree cleanliness policy before branching:
  - run `git status --porcelain` and inspect dirty paths
  - treat dirty workflow-memory paths as expected automation artifacts, not blockers:
    - `docs/workflow-memory/events/*.jsonl`
    - `docs/workflow-memory/index.json`
  - do not stop to ask stash/commit/stop choices when only those paths are dirty; continue the run and carry those changes into the execution branch
  - if checkout from `origin/main` is blocked by those local changes, temporarily stash only those workflow-memory paths, create/switch branch, then re-apply stash and continue
  - for any other unexpected dirty paths, stop and report blocker details with file list

Branching and implementation contract:
- Every code change must branch from latest main:
  - `git fetch origin main`
  - `git checkout -B codex/self-improvement-<issue-number>-<yyyymmddhhmm> origin/main`
- Implement the selected issue as one coherent incremental slice.
- If related issues were aggregated, implement the bundle as one coherent slice and keep scope bounded to one PR.
- If the selected issue contains a Research Trace or external paper links, append a log entry to `research/implemented-ideas.md` with:
  - date
  - issue and PR links
  - paper link(s)
  - idea(s) adopted
  - what was implemented in this repo
- If external research/paper ideas are adopted in the implementation, add/update documentation in `research/` in the same PR (at minimum `research/implemented-ideas.md`; add a detailed markdown note file when useful).

Validation gates (required, in order):
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:invariants`
- `pnpm test`
- `pnpm build`

Delivery behavior:
- On gate failure: do not merge; comment failure details on the issue; record blocker in memory and inbox.
- On success: commit and push, open one PR to main with:
  - closing/linking keywords for all aggregated issues addressed in the PR (`Fixes #...` for fully resolved issues, `Refs #...` for partially addressed issues)
  - a Judge Rationale section
  - an Aggregated Issues section listing all linked issues and resolution status
  - a Detailed Improvements and Benefits section (before/after behavior, system impact, risk/cost tradeoffs)
  - a Research Documentation Update section when applicable, including `research/` files added/updated
  Then add labels codex and codex-automation when available, and leave the PR open for human review/merge (do not auto-merge and do not delete branches in this automation).
- Do not verify closure in the same run after opening the PR; closure happens after human merge and can be checked in a later run.

Append run memory with candidate count, selected issue, score summary, PR URL, review-handoff status, and rejected-candidate rationale.
