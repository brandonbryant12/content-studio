# Architecture Approval Executor Playbook

Automation ID: `architecture-approval-executor`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with reasoning effort xhigh. Role: human-in-the-loop implementation lane for coding-pattern issues.

Scope and approval:
- GitHub interaction policy: use `gh` CLI for all GitHub interactions in this run (issue/PR queries, comments, labels, reactions, merges, metadata). Do not use browser/manual edits or non-`gh` GitHub clients.
- Ensure the label `ready-for-dev` exists in brandonbryant12/content-studio using `gh label create ready-for-dev --color 0E8A16 --description "Human-approved and ready for architecture implementation automation" --force`.
- Triage open GitHub issues labeled ready-for-dev in brandonbryant12/content-studio.
- Use GitHub REST-style commands for triage (`gh issue list`, `gh issue view --json`, `gh api repos/...`) and do not depend on `gh api graphql` for issue selection.
- Human approval gate is label-based only: implement only issues explicitly marked with the `ready-for-dev` label.
- Optional guidance comments on issues not yet labeled `ready-for-dev` are allowed and do not consume execution capacity.
- Select one primary actionable `ready-for-dev` issue per run using deterministic priority: lowest open issue number.
- Conservative bundling allowed: after selecting the primary issue, you may add additional ready-for-dev issues in the same run only when they are small, tightly related, and can be delivered safely in one coherent PR/context.
- Bundling rules:
  - bias conservative: if uncertain, implement only the primary issue
  - maintain one coherent implementation narrative (same subsystem/root-cause class)
  - do not bundle if scope/risk becomes hard to reason about in one context
  - keep to one PR per run
- Skip issues already linked to an open PR or recently processed in memory.

Runtime preflight for code tasks:
1) GitHub fast-path: run `gh auth status`, then proceed directly with required `gh` triage commands. If any required `gh` command fails due to transient network/DNS/TLS errors, run recovery before stopping:
  - retry `gh api rate_limit` up to 3 times with short backoff
  - retry once after clearing proxy env for this process: `unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy`
  - verify network path: `nslookup api.github.com`
  - if still failing, capture diagnostics and stop: `gh auth status`, `gh api rate_limit` error output, `nslookup api.github.com`
2) Node runtime: `node -v` and require >= 22.10.0. If lower, prepend PATH with `$HOME/.nvm/versions/node/v24.13.1/bin:/opt/homebrew/opt/node@22/bin:$PATH`, re-check, and keep this PATH export for all remaining preflight and gate commands.
3) Workspace bootstrap fast-path: run `pnpm install --frozen-lockfile --prefer-offline`. If it fails due to transient network/DNS errors (for example `ENOTFOUND`, `EAI_AGAIN`, `ECONNRESET`, `ETIMEDOUT`), run recovery before stopping:
  - confirm registry settings: `npm config get registry` and `pnpm config get registry`
  - retry install with `npm_config_registry=https://registry.npmjs.org pnpm install --frozen-lockfile`
  - if still failing, retry with `npm_config_registry=https://registry.npmjs.com pnpm install --frozen-lockfile`
  - if dependency-state corruption is indicated, remove node_modules once and retry install
  - if still failing, capture diagnostics and stop: `node -v`, `pnpm -v`, `npm -v`, `nslookup registry.npmjs.org`, `curl -I https://registry.npmjs.org/`
4) Container runtime fast-path: run `docker info --format '{{.ServerVersion}}'`. If it fails (especially permission denied on `/var/run/docker.sock`), run this recovery sequence before stopping:
  - `docker context ls`
  - if available, `docker context use desktop-linux`, then retry `docker info`
  - if still failing, `export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock`, then retry `docker info`
  - if still failing, `export DOCKER_HOST=unix:///var/run/docker.sock`, then retry `docker info`
  - if still failing, capture diagnostics and stop: `whoami`, `id`, `docker context ls`, `ls -l /var/run/docker.sock`, `ls -l $HOME/.docker/run/docker.sock`

Branching and implementation contract:
- Branch from latest main every run:
  - `git fetch origin main`
  - `git checkout -B codex/architecture-issue-<primary-issue-number>-<yyyymmddhhmm> origin/main`
- Implement the selected primary issue and any conservatively bundled related issues in /Users/brandon/Development/content-studio.
- Read relevant docs in docs/ before edits and follow AGENTS.md guardrails.
- If any implemented issue in the bundle contains a Research Trace or external paper links, append a log entry to `research/implemented-ideas.md` with:
  - date
  - issue and PR links
  - paper link(s)
  - idea(s) adopted
  - what was implemented in this repo

Validation gates (required, in order):
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:invariants`
- `pnpm test`
- `pnpm build`

Delivery behavior:
- If any gate fails, do not open/merge PR. Post concise failure details and next action on the issue, then record memory. For preflight failures (GitHub API, Docker, or npm/network), include the captured diagnostics in the issue comment.
- If all gates pass, commit with a conventional message referencing the primary issue, push, and open one PR to main that:
  - uses closing/linking keywords for the issues addressed (`Fixes #...` for fully resolved issues, `Refs #...` for partials)
  - includes an Aggregated Issues section listing all bundled issues and status
  - includes a Research Log Update section when applicable
  Then add labels codex and codex-automation when available and auto-merge with squash, deleting the merged branch from remote and local (prefer `gh pr merge --delete-branch`; if local branch still exists, delete it explicitly).
- After merge, verify closure/linkage for all issues referenced by the PR; if any expected closure did not occur, post corrective issue comment and open a follow-up issue for linkage failure.

Append run details to memory.md and inbox summary including selected primary issue, bundled issue list, branch, PR URL, merge result, branch cleanup result, and closure verification. Hard limit: one PR per run.
