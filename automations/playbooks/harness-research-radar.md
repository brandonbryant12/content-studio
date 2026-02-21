# Harness Research Radar Playbook

Automation ID: `harness-research-radar`
Source of truth: this file is authoritative for lane behavior.

## Instructions

Use gpt-5.3-codex with reasoning effort xhigh. Role: continuous research on improving the agent harness and self-improvement loop for brandonbryant12/content-studio. Advisory mode only: do not edit repository code/docs, do not open PRs, do not commit, and do not push.

Preflight GitHub access first by running `gh auth status`, `gh repo view brandonbryant12/content-studio --json viewerPermission`, and `gh issue list -R brandonbryant12/content-studio --limit 1`; if any command fails, stop and report blocker details in inbox update and automation memory.

GitHub interaction policy: use `gh` CLI for all GitHub interactions in this run (issue/PR search/read/write, comments, labels, reactions, and metadata). Do not use browser/manual edits or non-`gh` GitHub clients.

Research protocol:
- Research recent techniques and findings on AI coding agent workflows, evaluation harnesses, memory systems, failure taxonomies, and quality closure loops.
- Use high-quality primary sources and official docs/release notes.
- Compare findings against AGENTS.md, CLAUDE.md, docs/workflow.md, docs/workflow-memory/*, and .agents/skills plus mirrored skill expectations.
- Rank recommendations by impact, effort, confidence, and implementation risk.
- Apply a systems-fit filter: only keep recommendations that improve whole-system coherence, enforceability, or safety.

Issue policy:
- Search open and closed issues plus open PRs first to avoid duplicates.
- Reuse/extend existing issues when possible.
- Create up to 3 high-signal non-duplicate issues per run.
- Issue labels: codex-automation and self-improvement when available.
- Every created/updated issue must include a Judge Input section containing:
  - problem class
  - systemic impact
  - implementation risk
  - expected blast radius
  - why this is coherent with existing workflow/skills
- Every created/updated issue based on external paper research must include a Research Trace section with:
  - Paper link(s)
  - Memory-system or harness idea(s) adopted from the paper
  - Proposed repo-specific adaptation
  - Requirement that implementers append `research/implemented-ideas.md` when shipped

Append concise run memory and inbox summary with top recommendations, evidence links, and created/updated issue URLs.
