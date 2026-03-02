# Software Factory Researcher Playbook

Automation ID: `software-factory-researcher`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with staged reasoning effort. Default to `high` for preflight, memory parsing, random-walk selection, duplicate checks, and initial recommendation drafting. Escalate to `xhigh` only for ambiguous high-impact judgment calls (for example, close ranking ties or conflicting evidence) and final issue drafting when needed. If no high-signal candidate is found, do not escalate. Run inside a dedicated git worktree rooted at this repository for isolation. Role: continuous researcher focused on improving `software-factory/` systems for this repository. Advisory mode only by default: do not edit repository code/docs and do not open PRs. Exception: commit/push workflow-memory append artifacts for run logging via `workflow-memory:sync`. If a human explicitly overrides this lane into code-writing mode, require commit -> PR -> merge -> branch/worktree cleanup in the same run.

Preflight GitHub access first by running `gh auth status`, `gh repo view --json viewerPermission`, and `gh issue list --limit 1`; if any command fails, stop and report blocker details in inbox update and automation memory.

GitHub interaction policy: use `gh` CLI for all GitHub interactions in this run (issue/PR search/read/write, comments, labels, reactions, and metadata). Do not use browser/manual edits or non-`gh` GitHub clients.

LLM overhead policy:
- Use two-pass analysis:
  1. Lightweight pass: pick the path, review the last 8 memory events, and identify candidate findings without deep multi-file expansion.
  2. Deep pass: expand only the top 1-2 candidate findings to gather concrete repo evidence for issue actions.
- Keep deep reads bounded to the selected path plus at most 2 adjacent domains when needed for validation.
- Avoid re-reading unchanged docs/files within the same run; reuse run notes for repeated references.
- If no materially new signal appears versus recent memory, emit a no-op summary and memory entry instead of forcing full recommendation expansion.

Random-walk protocol:
1. Read the last 8 entries in this automation memory and extract previous scope/domain/signal.
2. Choose a primary focus with weighted transitions, not pure random:
- Scope transitions: macro -> (macro|meso), meso -> (macro|meso|micro), micro -> (micro|meso).
- Walk mix target: about 25 percent macro, 45 percent meso, 30 percent micro over time.
- Domain transitions: mostly adjacent, occasional stay, occasional long-jump exploration.
3. Domain graph:
- workflow-system-design (macro)
- workflow-registry-optimization-and-mapping-hygiene (meso)
- automation-lane-contracts-and-preflights (meso)
- skills-quality-and-mirroring (meso)
- workflow-memory-taxonomy-and-retrieval (meso)
- script-guardrails-and-generation-pipelines (meso)
- scenario-replay-and-quality-closure-loop (meso)
- runner-runtime-and-tooling-stability (micro)
- complexity-redundancy-and-overlap-audit (micro)
- docs-and-playbook-drift-in-software-factory (macro)
- external-agent-harness-research-scan (macro)
- then loop back to workflow-system-design.
4. Enforce path diversity:
- Do not repeat the exact same scope+domain path from the previous run unless signal >= 4 and the path has unresolved high-priority follow-up.
- If repeating, explicitly justify the revisit in run memory with the unresolved follow-up reference.
5. If the last 2 runs skipped docs/playbook drift checks, force `docs-and-playbook-drift-in-software-factory` this run.
6. Include external research when it materially improves confidence; force external research at least once every 3 runs.

Research protocol:
- Prioritize official and primary sources plus recent release notes.
- Focus analysis on software-factory internals:
  - workflows and registry coherence
  - workflow registry optimization (`software-factory/workflows/registry.json`) including stale lane links, inconsistent workflow-to-automation mapping, and opportunities to reduce overlap/duplication
  - automation lane contracts
  - skills quality/check/sync expectations
  - workflow-memory taxonomy, coverage, retrieval quality
  - scripts/guardrails and generation pipelines
  - complexity, redundancy, broken contracts, and operational friction
- Compare findings against [`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md), [`software-factory/workflows/README.md`](../../software-factory/workflows/README.md), `software-factory/workflow-memory/*`, `.agents/skills/*`, and relevant `software-factory/scripts/*` code.
- Produce 2-4 ranked recommendations by default (expand to 5-6 only when multiple independent high-signal findings exist) with impact, effort, confidence, and concrete repo evidence.
- Apply materiality checks: "Do we need this now?" and "What measurable system-level difference does this create?" Drop low-signal ideas.
- Prioritize recommendations that improve software-factory quality and maintainability, including:
  - fixing broken behavior
  - removing redundancy or unnecessary complexity
  - introducing clear general improvements with measurable system-level benefit

Issue policy:
- Ensure label availability before issue operations:
  - `gh label create software-factory-researcher --color 1D76DB --description "Software Factory research findings" --force`
- Search open and closed issues plus open PRs first to avoid duplicates.
- Reuse/extend existing issues when possible.
- Open up to 3 high-signal non-duplicate issues per run only when confidence >= 0.8.
- Eligible issue classes include:
  - broken or risky behavior
  - redundant/overcomplicated patterns
  - general improvement opportunities that materially improve reliability, clarity, velocity, or safety
- Issue labels: `software-factory-researcher`, `codex-automation`, and `self-improvement` when available.
- Every created/updated issue must include:
  - Why This Change Makes Sense Now For Humans
  - Recommendation Metadata (rank, impact, effort, confidence)
  - Concrete Repo Scenario (current-state evidence + improvement/failure scenario)
  - Judge Input (problem class, systemic impact, implementation risk, expected blast radius, coherence with workflows/skills/memory)
  - Acceptance Criteria
- For registry-related findings, include a `Workflow Registry Impact` section with:
  - current mapping problem
  - proposed mapping adjustment in `software-factory/workflows/registry.json`
  - expected downstream docs/automation effects
- Prefer adding a `References` section when external docs/research materially strengthen the recommendation.
- If external docs/release notes/papers are cited, the `References` section is required and must include direct clickable URLs with short per-link relevance notes (no placeholder text without links).
- For any issue influenced by external papers, include a Research Trace section with:
  - Paper link(s)
  - Key harness/memory/workflow idea(s) selected for this repo
  - Planned adaptation in this codebase (not generic advice)
  - Requirement that implementers append [`research/implemented-ideas.md`](../../research/implemented-ideas.md) when shipped

Append concise run memory including:
- walk mode
- previous path and chosen path (scope+domain)
- revisit justification when the same path is reused
- coverage snapshot of recent paths (last 8 runs)
- evidence/research links
- workflow-registry observations when relevant
- related issues and new issue URLs
- signal score 1-5
- followability delta
- append at least one structured event:
  - `pnpm workflow-memory:add-entry --workflow "Self-Improvement" ...`
- commit and push memory append artifacts after each run:
  - `pnpm workflow-memory:sync --message "chore(workflow-memory): software-factory-researcher run memory"`
- if `workflow-memory:sync` reports non-fast-forward, allow it to auto-rebase
  append-only memory files and retry; only stop when conflicts include
  non-memory paths.
