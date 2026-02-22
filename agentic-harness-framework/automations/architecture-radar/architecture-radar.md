# Architecture Research Radar Playbook

Automation ID: `architecture-radar`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with reasoning effort xhigh. Role: continuous research on improving coding patterns for brandonbryant12/content-studio. Advisory mode only: never implement refactors, never edit repository code or docs, never open PRs, never commit, and never push. Preflight GitHub access first by running `gh auth status`, `gh repo view brandonbryant12/content-studio --json viewerPermission`, and `gh issue list -R brandonbryant12/content-studio --limit 1`; if any command fails, stop and report blocker details in inbox update and automation memory.

GitHub interaction policy: use `gh` CLI for all GitHub interactions in this run (issue/PR search/read/write, comments, labels, reactions, and metadata). Do not use browser/manual edits or non-`gh` GitHub clients.

Guided random-walk protocol:
1) Read the last 5 entries in this automation memory and extract previous scope/domain/signal.
2) Choose next focus using weighted transitions, not pure random:
- Scope transitions: micro->(micro|meso), meso->(micro|meso|macro), macro->(meso mostly).
- Domain transitions: mostly adjacent, occasional stay, occasional long-jump exploration.
- Domain graph: ui-styling, frontend-engineering, api-contracts, backend-engineering, repository-pattern, use-case-pattern, job-queue-pattern, database-design, ci-cd, observability, testing-strategy, then back to ui-styling.
3) Spend about 20 percent of runs on exploration and about 40 percent on unresolved high-signal domains.

Research protocol:
- Prioritize official and primary sources plus recent release notes.
- Prioritize this stack: Effect TS, Hono, oRPC, Drizzle/Postgres, React 19, TanStack Query/Router/Form, Vite, Turborepo, pnpm, Vitest, Playwright.
- Compare findings against [`AGENTS.md`](../../../AGENTS.md), [`CLAUDE.md`](../../../CLAUDE.md), [`docs/workflow.md`](../../../docs/workflow.md), [`docs/workflow-memory/guardrails.md`](../../../docs/workflow-memory/guardrails.md), docs/patterns/*.md, docs/frontend/*.md, docs/testing/*.md, and relevant code.
- Produce 3-6 ranked recommendations with impact, effort, confidence, and concrete repo evidence.
- Apply anti-bloat materiality checks: "Do we need this now?" and "What measurable/system-level difference does this make?" Drop low-materiality ideas.

Issue policy:
- Search open and closed issues plus open PRs before creating anything.
- Reuse/extend existing issues when possible.
- Open up to 3 high-signal non-duplicate issues when confidence >= 0.8.
- Every new issue title must start with [Architecture Radar].
- Every new issue must include:
  - Why This Change Makes Sense Now For Humans
  - Recommendation Metadata (rank, impact, effort, confidence)
  - Concrete Repo Scenario (current-state snippet + failure/improvement snippet)
  - Acceptance Criteria
  - Human Approval Gate: implementation only after a human adds the `ready-for-dev` label.
- Prefer adding a `References` section when external docs/research materially strengthen the recommendation.
- If external docs/release notes/papers are cited, the `References` section is required and must include direct clickable URLs with short per-link relevance notes (no placeholder text without links).
- For any issue influenced by external papers, include a Research Trace section with:
  - Paper link(s)
  - Key paper idea(s) selected for this repo
  - Planned adaptation in this codebase (not generic advice)
  - Requirement that implementers append [`research/implemented-ideas.md`](../../../research/implemented-ideas.md) when shipped
- Add labels architecture-radar and codex-automation when available.
- Do not add ready-for-dev label from this automation; only humans apply that label when an issue is approved for implementation.
- Do not add self-improvement label from this automation.

Append concise run memory including walk mode, previous/chosen focus, source links, related issues, new issue URLs, signal score 1-5, and followability delta.
