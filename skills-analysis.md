# Skills System Analysis & Improvement Plan

*Inspired by [GEPA/gskill research](https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/) on automatically learning agent skills*

---

## Research Findings: What Makes Agent Skills Effective

GEPA's gskill pipeline tested hundreds of skill variants across Python (Jinja) and Go (Bleve) repos. Results:

- **Haiku 4.5 on Bleve**: 79.3% → 98.3% resolve rate, 173s → 142s per task (18% faster)
- **Haiku 4.5 on Jinja**: 93.9% → 100% resolve rate
- **Mini-SWE-Agent on Bleve**: 24% → 93% resolve rate (3.9x improvement)

### The 4 principles that emerged:

1. **Test-driven navigation** — "Run tests early and iterate from failures (tests are the bug report)"
2. **Systematic narrowing** — Progress from broad test execution to the specific failing case
3. **Minimal, iterative changes** — "Change one behavior at a time; rerun the smallest reproducing test after each change"
4. **Repository-specific conventions** — Concrete file paths, commands, and patterns for THIS specific codebase

### What effective skills look like:
- **Procedural numbered steps** with concrete file paths and commands
- **Concise** — the Bleve skill is ~30 lines of actionable guidance
- **Navigation-first** — teach the agent WHERE things are and HOW to fix them
- **NOT process documentation** — not "validate authn/authz" but "check that `packages/api/src/server/router/{domain}.ts` calls `requireOwnership` before the use case"

---

## Current State: 13 Content Studio Skills

### Skill Inventory

| Skill | Lines | Type | Trigger |
|-------|-------|------|---------|
| `content-studio-intake-triage` | 67 | Process | Start of any task |
| `content-studio-feature-delivery` | 88 | Process | Feature implementation |
| `content-studio-pr-risk-review` | 57 | Checklist | Pre-merge |
| `content-studio-test-surface-steward` | 50 | Audit | Test health review |
| `content-studio-architecture-adr-guard` | 60 | Guard | Architecture changes |
| `content-studio-security-dependency-hygiene` | 47 | Audit | Security review |
| `content-studio-performance-cost-guard` | 44 | Audit | Performance review |
| `content-studio-release-incident-response` | 49 | Process | Release/incident |
| `content-studio-docs-knowledge-drift` | 43 | Audit | After behavior changes |
| `content-studio-periodic-scans` | 76 | Meta | Recurring audits |
| `content-studio-self-improvement` | 83 | Meta | Post-incident/weekly |
| `content-studio-tanstack-vite` | 82 | Guard | Frontend changes |
| `react-doctor` | 42 | External tool | React audit |

**Total: ~788 lines across 13 skills**

### Diagnosis: 4 Problems

#### Problem 1: No Navigation Skills (The gskill Gap)

Zero skills teach the agent how to navigate this specific codebase. Every session, the agent must rediscover:
- Where use cases live (`packages/media/src/{domain}/use-cases/`)
- Where handlers are (`packages/api/src/server/router/{domain}.ts`)
- Where contracts are (`packages/api/src/contracts/{domain}s.ts`)
- Where frontend features are (`apps/web/src/features/{domain}s/`)
- Where tests are and how to run them

This is exactly what gskill proved is the highest-impact content.

#### Problem 2: ~40% Content Duplicates CLAUDE.md

Examples of repeated content:
- "Never hardcode query keys" — in CLAUDE.md line 88 AND `tanstack-vite` AND `pr-risk-review`
- "Auth before mutating existing resources" — in CLAUDE.md line 92 AND `pr-risk-review` AND `feature-delivery` AND `architecture-adr-guard`
- "Sanitize user-editable structured fields" — in CLAUDE.md line 93 AND `pr-risk-review` AND `feature-delivery`
- Validation command set (`pnpm typecheck`, `pnpm test`, etc.) — in CLAUDE.md AND `feature-delivery` AND `periodic-scans` AND `pr-risk-review`
- Every skill repeats a 5-8 line "Memory + Compounding" section with identical JSONL recording instructions

#### Problem 3: Too Abstract

Current skills say WHAT to check but not WHERE or HOW. Compare:

| Current (abstract) | gskill approach (concrete) |
|---|---|
| "Validate handler/use-case/repo separation" | "Open `packages/api/src/server/router/{domain}.ts`. Verify it calls exactly ONE use case from `packages/media/src/{domain}/use-cases/{action}.ts`" |
| "Validate authn/authz placement" | "In the use case file, search for `requireOwnership(entity.createdBy)` before any write operation" |
| "Run targeted tests" | "`pnpm --filter @repo/media test -- --run src/{domain}/use-cases/__tests__/{action}.test.ts`" |

#### Problem 4: No Debugging Skill

No skill teaches the agent the test-driven narrowing strategy. When a test fails, the agent has no procedural guidance for:
- Which test to run first
- How to read Effect error tags to find the root cause
- Common failure patterns and their fixes in this specific codebase

---

## Improvement Plan

### Phase 1: Add Two New High-Impact Skills (Do First)

#### New Skill: `content-studio-codebase-nav`

A file path map for this specific codebase. Covers all 6 domains with verified paths:

**Domain entity pattern** (replace `{domain}` with document, podcast, voiceover, infographic, persona, activity):

| Layer | Path |
|-------|------|
| DB Schema | `packages/db/src/schemas/{domain}s.ts` |
| Serialization | `packages/db/src/schemas/serialization.ts` |
| Domain errors | `packages/media/src/errors/{domain}-errors.ts` |
| Repository | `packages/media/src/{domain}/repos/{domain}-repo.ts` |
| Use cases | `packages/media/src/{domain}/use-cases/{action}.ts` |
| Use case tests | `packages/media/src/{domain}/use-cases/__tests__/{action}.test.ts` |
| API contract | `packages/api/src/contracts/{domain}s.ts` |
| API handler | `packages/api/src/server/router/{domain}.ts` |
| Integration tests | `packages/api/src/server/router/__tests__/{domain}.integration.test.ts` |
| Frontend feature | `apps/web/src/features/{domain}s/` |
| Frontend hooks | `apps/web/src/features/{domain}s/hooks/` |
| Frontend tests | `apps/web/src/features/{domain}s/__tests__/` |
| Route (list) | `apps/web/src/routes/_protected/{domain}s/index.tsx` |
| Route (detail) | `apps/web/src/routes/_protected/{domain}s/${domain}Id.tsx` |

**Cross-cutting locations**: test factories in `packages/media/src/test-utils/`, mock repos, AI mocks (`@repo/ai/testing`), storage mocks (`@repo/storage/testing`), API client (`apps/web/src/clients/apiClient.ts`), SSE publisher (`packages/api/src/server/publisher.ts`), invariant tests, error protocol.

**"I need to..." quick-lookup table**: add endpoint, add use case, add frontend page, fix test, add error type.

#### New Skill: `content-studio-debug-fix`

A test-driven debugging procedure with 4 phases:

1. **Reproduce** — run the specific failing test with `pnpm --filter {pkg} test -- --run {file}`
2. **Narrow** — read error `_tag`, trace to error file, find root cause in repo/use-case
3. **Fix** — make smallest change, re-run ONLY that test
4. **Expand** — package tests → typecheck → invariants → full suite

Includes a **Common Failure Patterns** table:

| Symptom | Root Cause | Fix Location |
|---------|-----------|-------------|
| `XxxNotFound` in test | Factory not creating data | Test file — check factory calls |
| `missing service X` | Layer not provided in test | Test setup — add to createTestRuntime |
| `Cannot read properties of undefined` | Mock not returning expected shape | Mock repo in test-utils |
| Type error in handler | Contract/input shape mismatch | `packages/api/src/contracts/{domain}s.ts` |
| Integration test fails without DB | Expected — needs `pnpm test:db:setup` | Run setup, not a code bug |
| Query key mismatch in web test | Hardcoded key instead of queryOptions | Feature hooks directory |
| MSW handler not matching | URL or method mismatch | Feature `__tests__/handlers.ts` |

Plus Effect-specific debugging guidance (valid patterns to not "fix", Layer construction rules, error union inference).

### Phase 2: Consolidate Existing Skills (12 → 8)

| Merge | Into | Rationale |
|-------|------|-----------|
| `intake-triage` + `feature-delivery` | **`content-studio-deliver`** | Intake always precedes delivery; one skill with two phases |
| `pr-risk-review` + `test-surface-steward` | **`content-studio-review`** | Both are pre-merge review activities |
| `architecture-adr-guard` + `docs-knowledge-drift` | **`content-studio-architecture-docs`** | Architecture validation and docs drift are naturally paired |
| `security-dependency-hygiene` + `performance-cost-guard` | **`content-studio-health-guard`** | Both are periodic quality audits with identical structure |

Each merged skill removes CLAUDE.md-duplicated content, replaces abstract steps with concrete file paths, and collapses the memory boilerplate to one line.

### Phase 3: Slim & Enhance Remaining Skills

| Skill | Action | Target |
|-------|--------|--------|
| `tanstack-vite` | Remove guardrails duplicated in CLAUDE.md. Keep TanStack/Vite-specific procedural steps only | ~40 lines |
| `self-improvement` | Add concrete trigger: check workflow-memory index for 3+ repeated patterns → update skills | ~55 lines |
| `periodic-scans` | Add "Skill Health Check" (verify file paths, no CLAUDE.md duplication). Slim cadence to point to workflow.md | ~40 lines |
| `release-incident-response` | Keep as-is | 49 lines |
| `react-doctor` | Remove — external CLI tool, document in README instead | Delete |

### Phase 4: Adopt gskill Procedural Format

All skills reformatted to:

```markdown
---
name: content-studio-{name}
description: {When to use.}
---
# {Name}
{One line: when to use.}
## Steps
{Numbered steps with concrete file paths and commands.}
## Common Mistakes (optional)
{Symptom | Cause | Fix table — only repo-specific gotchas.}
## Memory
Record a workflow memory event per `docs/workflow-memory/README.md`.
```

### Phase 5: Update References

- Update skill list in `CLAUDE.md` and `AGENTS.md`
- Update `docs/workflow.md` skill topology
- Run `scripts/sync-skills.sh`
- Record workflow memory event

---

## Final Skill Inventory (10 skills)

| Skill | Type | Status |
|-------|------|--------|
| `content-studio-codebase-nav` | Navigation map | **NEW** |
| `content-studio-debug-fix` | Debugging procedure | **NEW** |
| `content-studio-deliver` | Delivery workflow | MERGED |
| `content-studio-review` | Pre-merge review | MERGED |
| `content-studio-architecture-docs` | Architecture + docs guard | MERGED |
| `content-studio-health-guard` | Security + perf audit | MERGED |
| `content-studio-tanstack-vite` | Frontend guardrails | SLIMMED |
| `content-studio-self-improvement` | Meta-improvement loop | ENHANCED |
| `content-studio-periodic-scans` | Recurring audits | SLIMMED |
| `content-studio-release-incident-response` | Release/incident | KEPT |

**Net change**: 13 → 10 skills, ~788 → ~450 target lines, with the two highest-impact skill types (navigation + debugging) added.

---

## Implementation Priority

1. **Phase 1** (new skills) — highest impact, zero risk. Do first.
2. **Phase 2-3** (consolidation + slimming) — medium impact, low risk. One merge at a time.
3. **Phase 4-5** (format + references) — cleanup pass.

## Verification

After each phase:
1. `scripts/sync-skills.sh` — verify all symlinks resolve
2. `ls -la .claude/skills/ .agent/skills/ .github/skills/` — confirm mirrors match
3. Invoke a skill by name to verify it loads
4. Verify no CLAUDE.md content was lost during updates
