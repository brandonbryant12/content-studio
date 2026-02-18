---
name: project-spirit-auditor
description: >
  Analyze project docs and codebase to infer project spirit, then run a
  holistic improvement scan across architecture, correctness, testing, UX,
  accessibility, security, performance, developer experience, and
  documentation. Use when asked to "understand this project", "scan for
  improvements", "audit everything", "find weaknesses", or "propose priorities
  in any facet of the project".
argument-hint: <directory>
metadata:
  author: brandon
  version: "1.0.0"
---

# Project Spirit Auditor

Run a full-spectrum project audit on `$ARGUMENTS` (default: `.`) with strong autonomy and practical guardrails.

## Autonomy Contract

Operate proactively without waiting for step-by-step approval.

Proceed independently for:
- Repo and docs discovery
- Reading files and running non-destructive analysis commands
- Producing prioritized findings and recommendations
- Applying low-risk quick wins when the user asks for fixes, not just review

Pause and ask before:
- Destructive operations (`reset`, force deletes, data migrations)
- Major dependency or infrastructure changes
- Breaking API or behavior changes
- Security-sensitive actions involving credentials or production systems

If unsure, choose the reversible option and state assumptions.

## Outcome

Deliver both:
1. A concise **Project Spirit Snapshot** (what this project is trying to be)
2. A prioritized **Improvement Backlog** (what to improve next, across all facets)

## Workflow

1. **Resolve scope**
   - Use `$ARGUMENTS` as target directory.
   - If empty, use repository root.
   - Exclude CI/CD pipeline review from this audit.

2. **Ingest intent first (Project Spirit pass)**
   - Read top-level intent docs first: `README*`, `docs/**`, `CLAUDE.md`, contribution/design docs, product notes, architecture docs.
   - Read project manifests and workspace config: `package.json`, lock/workspace files, build/test configs.
   - Build a short Spirit Snapshot:
     - Mission and target users
     - Primary workflows/use cases
     - Quality bar and product values
     - Explicit constraints and non-goals
     - Technical principles already implied by docs

3. **Map the system**
   - Inventory apps/packages/services, key runtime boundaries, and dependency hotspots.
   - Identify critical paths: user-facing flows, core business logic, and data boundaries.

4. **Run a holistic scan by facet**
   - Architecture: layering, coupling, module boundaries, ownership clarity
   - Correctness: bug risks, edge cases, error handling, data validation
   - Tests: coverage quality, brittle tests, missing high-value integration paths
   - Performance: bundle/runtime hotspots, unnecessary re-renders, slow queries, caching gaps
   - Security: secrets handling, auth/authz boundaries, input trust assumptions, dependency risk
   - UX and accessibility: clarity, keyboard/screen-reader basics, interaction friction
   - Developer experience: scripts, local setup friction, consistency, tooling ergonomics
   - Documentation: staleness, missing decision records, onboarding gaps
   - Product alignment: mismatches between implemented behavior and stated project spirit

5. **Score and prioritize**
   - For each finding, assign:
     - Severity: Critical / High / Medium / Low
     - Impact: 1-5
     - Effort: S / M / L
     - Confidence: High / Medium / Low
   - Sort by severity, then impact, then effort.
   - Prefer high-confidence, low-effort, high-impact items as immediate wins.

6. **Act on quick wins when appropriate**
   - If user asked for improvements (not review-only), implement a small set of safe fixes:
     - typo/doc clarity fixes
     - dead-code or obvious simplification with no behavior change
     - missing guard clauses or validation in clear bug-prone paths
     - small test additions for uncovered critical behavior
   - Validate changes with targeted tests/lint/typecheck when available.

7. **Report with evidence**
   - Include file references for every non-trivial finding.
   - Separate:
     - Findings (problems and risks)
     - Fixes applied (if any)
     - Recommended next wave (larger improvements)

## Reporting Format

Use this exact structure:

1. **Project Spirit Snapshot**
   - 4-8 bullets describing intent, values, constraints, and current trajectory.

2. **Top Findings (ordered by severity)**
   - `[Severity] [Facet]` one-line issue statement
   - Why it matters
   - Evidence: `path/to/file:line`
   - Recommended fix
   - Impact / Effort / Confidence

3. **Quick Wins Applied** (if edits were made)
   - What changed
   - Why safe
   - Verification performed

4. **90-Day Improvement Backlog**
   - Phase 1: immediate stabilization
   - Phase 2: structural improvements
   - Phase 3: strategic upgrades

5. **Open Questions**
   - Only unresolved decisions that materially affect recommendations.

## Quality Bar

- Be concrete, evidence-based, and repo-specific.
- Do not provide generic advice without locating a real project signal.
- Prefer incremental, testable improvements over broad rewrites.
- Keep momentum: identify what to do now, next, and later.
