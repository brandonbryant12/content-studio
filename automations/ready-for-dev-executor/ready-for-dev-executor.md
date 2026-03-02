# Ready-for-Dev Executor Playbook

Automation ID: `ready-for-dev-executor`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with staged reasoning effort. Default to `high` for issue triage, duplicate/open-PR checks, actionability screening, command execution, and run reporting. Escalate to `xhigh` only for ambiguous high-impact decisions (for example, final bundle composition tradeoffs, risky workflow-routing decisions, or weak/conflicting issue evidence). Keep to `high` when decisions are routine and evidence is clear. Role: human-in-the-loop implementation lane for any repository issue explicitly approved with `ready-for-dev`. Execute all code-writing work from a dedicated git worktree, never from the primary checkout.

Scope and approval:
- GitHub interaction policy: use `gh` CLI for all GitHub interactions in this run (issue/PR queries, comments, labels, reactions, merges, metadata). Do not use browser/manual edits or non-`gh` GitHub clients.
- Ensure the label `ready-for-dev` exists in this repository using `gh label create ready-for-dev --color 0E8A16 --description "Human-approved and ready for implementation automation" --force`.
- Triage open GitHub issues labeled `ready-for-dev` in this repository.
- Label-driven routing is required:
  - each candidate issue should carry exactly one `model:*` label and one `thinking:*` label
  - use `pnpm software-factory operation run ready-for-dev-executor` for model/thinking-based launch routing from CLI/wrappers
  - if labels are missing, default launch settings are `model:gpt-5.3-codex` and `thinking:high`
- This lane is the single implementation executor for issues labeled `ready-for-dev`, whether approved directly by humans or by the `issue-evaluator` lane using the repository readiness rubric.
- Use GitHub REST-style commands for triage (`gh issue list`, `gh issue view --json`, `gh api repos/...`) and do not depend on `gh api graphql` for issue selection.
- Human approval gate is label-based only: implement only issues explicitly marked with the `ready-for-dev` label.
- Optional guidance comments on issues not yet labeled `ready-for-dev` are allowed and do not consume execution capacity.
- Prerequisite unblockers policy:
  - do not add extra product scope/roadmap issues
  - if a required validation gate fails because of a pre-existing regression that blocks selected issue validation, a minimal prerequisite unblocker fix is allowed in the same branch/PR
  - prerequisite unblockers must be explicitly documented in run output under `Prerequisite Unblockers` with file paths and why they were required

Selection and bounded aggregation (`1..N` issues per run):
- Build candidate set from actionable open issues labeled `ready-for-dev`, ordered by issue number ascending.
- Operation-level execution is two-stage:
  1. planner call selects a coherent bundle and a single model/thinking profile
  2. executor call implements only that selected bundle
- Select at least 1 issue when actionable candidates exist.
- N is dynamic and must stay bounded by coherent scope: default target is 1-3 issues; allow up to 5 only when issues are small, tightly related, and safely deliverable together in one PR.
- Use two-pass issue selection to reduce overhead:
  1. Lightweight pass (no worktree/bootstrap/tests): `gh issue list` + minimal metadata (`state`, `labels`, linked open PR presence, recent memory status) to build a shortlist.
  2. Deep pass (shortlist only, max 5): fetch full issue context and acceptance criteria, then finalize selection/bundle.
- Bundling rules:
  - bias conservative: if uncertain, reduce scope and implement fewer issues
  - maintain one coherent implementation narrative (same subsystem/root-cause class)
  - do not bundle if scope/risk becomes hard to reason about in one context
  - keep to one PR per run
- Bundle budget heuristic:
  - estimate issue complexity points before final selection: `1` (tiny/localized), `2` (small multi-file), `3` (medium or contract-sensitive)
  - target total bundle points <= 4 by default for hourly runs
  - allow up to 6 points only when all issues are same subsystem, low-risk, and clearly verifiable together
  - carry overflow to later runs instead of stretching one bundle
- Never bundle with other issues when a candidate includes any of:
  - database schema/migration changes
  - cross-package API contract changes
  - authz/security-sensitive behavior changes
  - observability lifecycle/runtime boot changes
- Skip issues already linked to an open PR or recently processed in memory without new human approval signal.
- Before final selection, run an actionability screen on candidates and skip any candidate that fails one of these checks:
  - no longer open, missing `ready-for-dev`, or assigned status changed since list call (re-check with `gh issue view --json state,labels`)
  - already linked to an open PR
  - recently processed in automation memory without new human approval signal
  - already implemented on `main` based on concrete code evidence mapped to issue acceptance criteria
- For "already implemented on `main`" candidates, do not run implementation preflight/gates; instead:
  - post a concise evidence comment with file path(s) and line references
  - close issue as completed when criteria are satisfied
  - record this as `selection_outcome: skipped_already_implemented` in memory and continue candidate screening in the same run
- If no actionable issue remains after screening, end run with a concise no-op summary and memory entry (no branch/PR).

Workflow routing contract (must use correct workflow per selected issue):
- For each selected issue, assign a primary workflow and companion skills before coding using [`software-factory/workflows/README.md`](../../software-factory/workflows/README.md):
  - `Feature Delivery` for product/backend/frontend implementation work
  - `Architecture + ADR Guard` for boundary/runtime/layer/authz/observability architecture-impacting work
  - `Self-Improvement` for harness/workflow-memory/skills/automation-loop improvements
- For each selected issue, document route rationale in PR output under a `Workflow Routing` section.
- For bundled issues, ensure workflow routes are compatible in one coherent PR; if not compatible, reduce bundle size and carry overflow to later runs.
- Execute using the selected workflow contracts and required docs/guardrails for each routed task.

Runtime preflight for code tasks:
- Run this preflight only after at least one actionable issue remains after screening.
1) GitHub fast-path: run `gh auth status`, then proceed directly with required `gh` triage commands. If any required `gh` command fails due to transient network/DNS/TLS errors, run recovery before stopping:
  - retry `gh api rate_limit` up to 3 times with short backoff
  - retry once after clearing proxy env for this process: `unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy`
  - verify network path: `nslookup api.github.com`
  - if still failing, capture diagnostics and stop: `gh auth status`, `gh api rate_limit` error output, `nslookup api.github.com`
2) Shell + Node runtime: run toolchain checks through interactive login zsh and require Node >= 22.10.0:
  - `zsh -lic 'cd "$PWD" && node -v && pnpm -v && npm -v'`
  - run all remaining Node/pnpm preflight and gate commands through the same `zsh -lic` pattern in this run (do not hardcode Homebrew/corepack shim paths)
  - when inside dedicated worktree execution, run commands as `zsh -lic 'cd "$WORKTREE_DIR" && <command>'`; do not hand-type absolute worktree paths
  - if check fails, capture diagnostics and stop: `echo $SHELL`, `which node`, `node -v`, `which pnpm`, `pnpm -v`, `which corepack`, `corepack --version`
3) Workspace bootstrap fast-path: run `zsh -lic 'cd "$PWD" && pnpm install --frozen-lockfile --prefer-offline'`. If it fails due to transient network/DNS errors (for example `ENOTFOUND`, `EAI_AGAIN`, `ECONNRESET`, `ETIMEDOUT`), run recovery before stopping:
  - confirm registry settings: `npm config get registry` and `pnpm config get registry`
  - retry install with `npm_config_registry=https://registry.npmjs.org pnpm install --frozen-lockfile`
  - if still failing, retry with `npm_config_registry=https://registry.npmjs.com pnpm install --frozen-lockfile`
  - if dependency-state corruption is indicated, remove node_modules once and retry install
  - if still failing, capture diagnostics and stop: `node -v`, `pnpm -v`, `npm -v`, `nslookup registry.npmjs.org`, `curl -I https://registry.npmjs.org/`
4) Container runtime preflight:
  - run `docker version --format '{{.Server.Version}}'`
  - Docker is required for this repository because integration/workflow tests use PostgreSQL Testcontainers
  - if Docker is unavailable, stop before implementation and post an issue comment with:
    - failing command
    - stderr snippet
    - explicit `environment-blocked` status
    - next-action instruction (for example "start Docker, then rerun ready-for-dev-executor")
5) Worktree cleanliness policy before branching:
  - run `git status --porcelain` and inspect dirty paths
  - treat dirty workflow-memory paths as expected automation artifacts, not blockers:
    - `software-factory/workflow-memory/events/*.jsonl`
    - `software-factory/workflow-memory/index.json`
  - do not stop to ask stash/commit/stop choices when only those paths are dirty; continue the run and carry those changes into the execution branch
  - if checkout from `origin/main` is blocked by those local changes, temporarily stash only those workflow-memory paths, create/switch branch, then re-apply stash and continue
  - for any other unexpected dirty paths in the primary checkout, continue by doing all implementation in a fresh `origin/main` worktree and leave primary-checkout files untouched
  - include unexpected dirty-path list in run output under `Primary Checkout Dirty Paths` for operator visibility

Branching and implementation contract:
- Branch from latest main every run using a dedicated git worktree:
  - `git fetch origin main`
  - `REPO_ROOT="$(git rev-parse --show-toplevel)"`
  - `RUN_TS="$(date +%Y%m%d%H%M)"`
  - `WORKTREE_BRANCH="codex/ready-for-dev-<primary-issue-number>-$RUN_TS"`
  - `WORKTREE_DIR="$REPO_ROOT/.codex-worktrees/ready-for-dev-<primary-issue-number>-$RUN_TS"`
  - `mkdir -p "$REPO_ROOT/.codex-worktrees"`
  - `git worktree add -B "$WORKTREE_BRANCH" "$WORKTREE_DIR" origin/main`
  - `export WORKTREE_BRANCH WORKTREE_DIR`
  - `cd "$WORKTREE_DIR"`
- Implement the selected issue set and any conservatively bundled related issues only in `"$WORKTREE_DIR"`.
- Read relevant docs in docs/ before edits and follow [`AGENTS.md`](../../AGENTS.md) guardrails.
- If any implemented issue in the bundle contains a Research Trace or external paper links, append a log entry to [`research/implemented-ideas.md`](../../research/implemented-ideas.md) with:
  - date
  - issue and PR links
  - paper link(s)
  - idea(s) adopted
  - what was implemented in this repo

Validation gates (required, in order):
Run each gate via `zsh -lic 'cd "$WORKTREE_DIR" && <gate-command>'`.
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:invariants` (required when backend/shared domain code changes)
- Targeted tests (always required):
  - prefer workspace-targeted commands first (for example `pnpm --filter <workspace> test`)
  - use `pnpm test:unit` for non-`@repo/api` iteration loops
- `pnpm test:ci` (required when any of the following are true):
  - 2+ workspaces are modified
  - shared test/tooling changed (`package.json`, `turbo.json`, `vitest*.config.ts`, `packages/testing/**`, `scripts/testing/**`)
  - API/server/worker runtime surfaces changed (`packages/api/**`, `apps/server/**`, `apps/worker/**`)
- `pnpm build`
- If a gate fails due to a pre-existing regression that is outside selected issue acceptance criteria but blocks required validation, implement a minimal prerequisite unblocker, then restart gate execution from the first failed gate.
- Cap prerequisite unblocker iteration to one pass; if gates still fail, report blocker details and stop without PR.

Delivery behavior:
- If any gate fails, do not open/merge PR. Post concise failure details and next action on the primary issue, then record memory. For preflight failures (GitHub API, npm/network, Docker), include captured diagnostics in issue comments.
- Always post issue comments with `gh issue comment --body-file <temp-file>` (not inline `--body`) to avoid shell escaping/interpolation failures.
- If all gates pass, commit with a conventional message referencing the primary issue, push, and open one PR to main that:
  - uses closing/linking keywords for the issues addressed (`Fixes #...` for fully resolved issues, `Refs #...` for partials)
  - MUST include `Fixes #<primary-issue-number>` for the primary issue when the run intent is full resolution
  - includes an `Aggregated Issues` section listing all bundled issues and status
  - includes a `Workflow Routing` section mapping each issue to workflow + skills used
  - includes a `Prerequisite Unblockers` section when any unblocker fix was included
  - includes a `Research Log Update` section when applicable
  Then run a pre-merge linkage gate:
  - fetch PR body via `gh pr view --json body,number,url`
  - verify primary issue has a closing keyword (`Fixes #<primary-issue-number>` or `Closes #<primary-issue-number>`)
  - verify each bundled issue line in Aggregated Issues matches intent (`Fixes #...` for fully resolved, `Refs #...` for partial)
  - if linkage check fails, do not merge; update PR body or post a blocking comment, then record memory
  Then add automation labels only when they exist in the repository and merge with squash. Use worktree-safe cleanup ordering:
  - discover available labels once (`gh label list --json name --jq '.[].name'`) and apply only existing labels from the desired set (`codex`, `codex-automation`)
  - if a desired label is absent, skip it without failing the run
  - prefer `gh pr merge --squash` (without `--delete-branch`) to avoid checked-out branch deletion failures in worktree contexts
  - verify merge completion via `gh pr view --json state,mergedAt,url`
  - remove worktree first: `git worktree remove "$WORKTREE_DIR"`
  - then delete local branch pointer if present: `git branch -D "$WORKTREE_BRANCH"`
  - then delete remote branch pointer if still present (best effort)
  - if remote branch deletion fails only because the workspace-clean pre-push hook sees unrelated dirty files in primary checkout, retry once with `SKIP_WORKSPACE_CLEAN_CHECK=1 git push origin --delete "$WORKTREE_BRANCH"` and continue
  - if merge command exits non-zero but PR state is `MERGED`, treat as successful merge and continue cleanup
- After merge, verify closure/linkage for all issues referenced by the PR; if any expected closure did not occur, post corrective issue comment and open a follow-up issue for linkage failure.

Persist run memory in git-tracked workflow memory and include an inbox summary
with selected issue set, bundled issue count, workflow routing summary, branch,
PR URL, merge result, branch cleanup result, and closure verification. Hard
limit: one PR per run.
- append at least one structured event:
  - use full required flags, including `--follow-up` and `--owner`:
    - `pnpm workflow-memory:add-entry --workflow "<Core Workflow>" --title "<title>" --trigger "<trigger>" --finding "<finding>" --evidence "<evidence>" --follow-up "<follow-up>" --owner "codex" --status "<status>" --tags "skill:feature-delivery,automation:ready-for-dev-executor"`
  - valid core workflow values: `Feature Delivery`, `Architecture + ADR Guard`, `Self-Improvement`, `Periodic Scans`, `Docs + Knowledge Drift`
  - pass tags as a single comma-separated value (`--tags "skill:feature-delivery,automation:ready-for-dev-executor"`)
  - scenario flags are all-or-nothing: either omit all `--scenario-*` flags, or include at least `--scenario-skill`, `--scenario-check`, and `--scenario-verdict`
  - when present, `--scenario-verdict` must be exactly `pass` or `fail`
- commit and push memory append artifacts after each run:
  - `pnpm workflow-memory:sync --message "chore(workflow-memory): ready-for-dev-executor run memory"`
- if `workflow-memory:sync` reports non-fast-forward, allow it to auto-rebase
  append-only memory files and retry; only stop when conflicts include
  non-memory paths.
