---
name: deep-clean
description: >
  Comprehensive code audit and cleanup pipeline for a directory. Fixes tests,
  simplifies code, checks framework patterns (Effect, React), and applies
  Vercel/web design best practices. Uses an agent swarm for parallel execution.
  Use when asked to "deep clean", "audit and clean", "polish code", or "clean up a package".
disable-model-invocation: true
argument-hint: <directory>
metadata:
  author: brandon
  version: "2.0.0"
---

# Deep Clean v2 — Agent Swarm Pipeline

Run a parallelized audit and cleanup pipeline on the target directory: `$ARGUMENTS`

ultrathink

---

## Architecture & Execution Order

The pipeline follows a deliberate order: **tests → simplify → research → pattern fixes → UX**. Each phase builds on the confidence established by the previous one.

```
Lead (you)
├── Phase 0 (parallel):
│   ├── test-auditor       (general-purpose — fix/improve tests)
│   └── standards-researcher (Explore — read standards, query Context7)
├── Phase 1 (after test-auditor):
│   └── code-simplifier    (code-simplifier — simplify with test confidence)
├── Phase 2 (after code-simplifier, uses researcher output):
│   └── code-worker        (general-purpose — scan + fix pattern violations)
├── Phase 3 (after code-worker, frontend only):
│   └── ux-worker          (general-purpose — accessibility + UI/UX)
└── Phase 4 (lead):
    └── Final verification, report, memory updates
```

**Why this order:**
1. **Tests first** — establishes a safety net before any code changes
2. **Simplify** — now we can safely refactor knowing tests will catch regressions
3. **Research + patterns** — the researcher analyzes *simplified* code, so violations are real (not noise from messy code). Context7 runs parallel with test-audit for free.
4. **UX** — polish the final cleaned code

---

## Step 0: Setup

1. **Identify the target directory.** If `$ARGUMENTS` is empty, ask the user which directory to clean.

2. **Determine the code type** — backend (Effect TS), frontend (React), or mixed — by scanning file extensions and imports in `$ARGUMENTS`.

3. **Read your auto-memory files** at `/Users/brandon/.claude/projects/-Users-brandon-Development-content-studio/memory/` for known gotchas — especially `MEMORY.md` and `ai-anti-patterns.md` if it exists.

4. **Run baseline tests** and capture the output:

```bash
pnpm vitest run --reporter=verbose $ARGUMENTS 2>&1 | tail -80
```

Record: how many pass, fail, and the names of failing tests.

5. **Create the team:**

```
TeamCreate: team_name="deep-clean", description="Deep clean audit for $ARGUMENTS"
```

6. **Create all tasks with dependencies:**

| # | Task | blockedBy |
|---|------|-----------|
| 1 | Research standards & query Context7 | — |
| 2 | Audit and improve tests | — |
| 3 | Simplify code | 2 |
| 4 | Scan simplified code & fix pattern violations | 1, 3 |
| 5 | Fix UI/UX & accessibility (frontend only) | 4 |
| 6 | Final verification & report | 4 (and 5 if frontend) |

Use `TaskCreate` for each, then `TaskUpdate` to set `addBlockedBy` on tasks 3, 4, 5, and 6.

If the code type is **backend only**, skip task 5 entirely (don't create it) and task 6 is only blocked by 4.

---

## Step 1: Spawn Phase 0 — Test Auditor + Standards Researcher (Parallel)

Spawn both agents simultaneously using two `Task` tool calls in a single message. Both run in background.

### 1a: Standards Researcher (Explore agent)

This agent reads standards, queries Context7, and reads Vercel skill rules — purely collecting knowledge. It does NOT scan source code yet (that happens in Phase 2 after simplification).

```
Task:
  name: "standards-researcher"
  subagent_type: Explore
  team_name: "deep-clean"
  run_in_background: true
  mode: "default"
```

**Standards researcher prompt** (adapt `$CODE_TYPE` with actual value):

```
You are the STANDARDS RESEARCHER for a deep-clean audit.
Code type: $CODE_TYPE (backend/frontend/mixed).

Your job is READ-ONLY knowledge gathering. Do NOT scan source code — another agent does that later. Your output will be used by a code-worker to find and fix violations in already-simplified code.

## Task 1: Read Project Standards

Read ALL standards files relevant to this code type:

**Backend (Effect TS) — read if backend or mixed:**
- standards/patterns/use-case.md
- standards/patterns/repository.md
- standards/patterns/router-handler.md
- standards/patterns/error-handling.md
- standards/patterns/effect-runtime.md
- standards/patterns/serialization.md
- standards/patterns/enum-constants.md

**Frontend (React) — read if frontend or mixed:**
- standards/frontend/components.md
- standards/frontend/data-fetching.md
- standards/frontend/mutations.md
- standards/frontend/forms.md
- standards/frontend/styling.md
- standards/frontend/project-structure.md
- standards/frontend/suspense.md
- standards/frontend/error-handling.md
- standards/frontend/real-time.md
- standards/frontend/testing.md

**Testing (always):**
- standards/testing/use-case-tests.md
- standards/testing/integration-tests.md

Also read the memory files at:
/Users/brandon/.claude/projects/-Users-brandon-Development-content-studio/memory/
Especially: MEMORY.md, ai-anti-patterns.md (if exists), testing-grading-rubric.md

## Task 2: Query Context7 for Current Best Practices

Use resolve-library-id + query-docs for:
- "effect" — error handling, dependency injection, concurrency, resource management (if backend/mixed)
- "react" — component patterns, hooks, performance (if frontend/mixed)
- "tanstack-query" — query/mutation patterns (if frontend/mixed)

Focus queries on patterns that are common in this type of codebase.

## Task 3: Read Vercel Skill Rules (Frontend/Mixed Only)

If frontend or mixed, read these rule files:
- Glob for .agents/skills/vercel-react-best-practices/rules/**/*.md — read all, note CRITICAL and HIGH priority ones
- Glob for .agents/skills/vercel-composition-patterns/rules/**/*.md — read all

## Task 4: Produce Your Report

Your FINAL output must be a structured knowledge report with these sections:

### Standards Checklist
For each standard file you read, extract the key rules as a concise checklist. Format:
- **[file]**: rule 1, rule 2, rule 3...

### Context7 Findings
- Any updated patterns, deprecated APIs, or new best practices from Context7
- Specific code patterns to look for (with examples from the docs)

### Vercel Rules Summary (if applicable)
- CRITICAL priority rules: (list)
- HIGH priority rules: (list)
- Composition patterns to check for: (list)

### Memory Gotchas
- Relevant gotchas from memory files that apply to this code type

### What to Look For
Synthesize everything into a prioritized checklist of things the code-worker should scan for:
1. (critical items)
2. (high items)
3. (medium items)
```

### 1b: Test Auditor (general-purpose agent)

```
Task:
  name: "test-auditor"
  subagent_type: general-purpose
  team_name: "deep-clean"
  run_in_background: true
  mode: "bypassPermissions"
```

**Test auditor prompt** (adapt variables):

```
You are the TEST AUDITOR for a deep-clean audit of `$ARGUMENTS`.
Code type: $CODE_TYPE.

Baseline test results:
$BASELINE_RESULTS

Known pre-existing failures (do NOT try to fix these — they are infrastructure issues):
- podcast-workflow.test.ts, podcast.integration.test.ts (missing hostPersonaId column)
- document-list.test.tsx, podcast-list.test.tsx, voiceover-detail.test.tsx (search placeholder / audio player issues)

IMPORTANT: You ONLY modify test files (*.test.ts, *.test.tsx). Do NOT modify source files.

Your goal: establish a solid test safety net so subsequent agents can refactor code with confidence.

## Your Tasks

### 1. Discover test files
Glob for **/*.test.ts and **/*.test.tsx inside `$ARGUMENTS`.

### 2. Discover untested source files
Compare source files against test files. Files that need tests:
- Use cases, hooks, components, utilities, repositories
Files exempt from testing:
- Re-exports, type-only files, index barrels

### 3. Read the testing standards
- standards/testing/use-case-tests.md (backend)
- standards/testing/integration-tests.md (integration)
- standards/frontend/testing.md (frontend)
- /Users/brandon/.claude/projects/-Users-brandon-Development-content-studio/memory/testing-grading-rubric.md
- /Users/brandon/.claude/projects/-Users-brandon-Development-content-studio/memory/testing-effect-ts.md (if backend)
- /Users/brandon/.claude/projects/-Users-brandon-Development-content-studio/memory/testing-react.md (if frontend)

### 4. Grade and fix existing tests
For each test file:
- Read it and the source file it tests
- Grade using the 6-dimension rubric
- Fix failing tests (do NOT delete tests to make them pass)
- Improve weak tests: add error paths, edge cases, boundary conditions
- For Effect: tagged error assertions, layer isolation, @effect/vitest patterns
- For React: accessibility queries, user interaction flows

### 5. Add missing tests
Write tests for untested source files that warrant coverage.

### 6. Verify all tests pass
Run: pnpm vitest run --reporter=verbose $ARGUMENTS
If tests fail, fix them. Repeat until green (excluding known pre-existing failures).

### 7. Produce your summary
Your FINAL output must include:
- Tests before: X passing, Y failing
- Tests fixed: (list)
- Tests improved: (list with what was added)
- Tests created: (list with what they cover)
- Tests after: X passing
- Any new testing patterns discovered

## Rules
- Never use `as any` in tests — use typed mock factories from packages/media/src/test-utils/
- Follow @effect/vitest patterns: `import { it } from '@effect/vitest'` + `import { describe, expect } from 'vitest'`
- Never import vitest at top-level in shared helpers
- Test behavior and outcomes, not implementation details
```

### Wait for Phase 0

After spawning both, monitor their progress. Use `Read` on their output files or `TaskOutput` to check status.

**The test-auditor must complete before Phase 1 can start.** The standards-researcher can still be running — its output is only needed in Phase 2.

When the test-auditor completes:
1. Read its summary
2. Mark task 2 as completed via `TaskUpdate`

When the standards-researcher completes:
1. Read its knowledge report — save this for the code-worker prompt in Phase 2
2. Mark task 1 as completed via `TaskUpdate`

---

## Step 2: Spawn Phase 1 — Code Simplifier

Only start after the test-auditor has completed (task 2 done). Tests are now green and solid.

```
Task:
  name: "code-simplifier"
  subagent_type: code-simplifier
  team_name: "deep-clean"
  run_in_background: true
  mode: "bypassPermissions"
```

**Code simplifier prompt:**

```
You are the CODE SIMPLIFIER for a deep-clean of `$ARGUMENTS`.
Code type: $CODE_TYPE.

Tests are now passing — you have a safety net. Your job is to simplify source code for clarity, consistency, and maintainability.

IMPORTANT: Do NOT modify test files (*.test.ts, *.test.tsx) — those were already handled.

## What to Simplify

For each source file in `$ARGUMENTS`:
- Remove dead code, unused variables, unused imports
- Simplify overly complex conditionals and control flow
- Reduce unnecessary abstraction layers
- Flatten deeply nested code
- Replace verbose patterns with idiomatic equivalents
- Consolidate duplicate logic
- Keep functions focused (single responsibility)
- Keep files under 300 lines
- Use kebab-case filenames

## AI Anti-Patterns to Remove

$AI_ANTI_PATTERNS_TABLE

## After Simplification

Run tests to verify nothing broke:
pnpm vitest run --reporter=verbose $ARGUMENTS
If anything breaks, fix it. Repeat until green.

## Produce Your Summary

Your FINAL output must include:
- Files modified: (list)
- Simplifications applied: (bullet list)
- Lines removed: ~N (estimate)
- Any regressions encountered and how they were resolved

## Rules
- Don't add unnecessary comments, docstrings, or type annotations to unchanged code
- Don't over-engineer — the goal is simplification, not adding complexity
- Don't modify test files
- Commit nothing
```

**IMPORTANT:** Replace `$AI_ANTI_PATTERNS_TABLE` with the actual table from the "AI Anti-Patterns Reference" section at the bottom of this skill.

### Wait for Phase 1

When the code-simplifier completes:
1. Read its summary
2. Mark task 3 as completed via `TaskUpdate`
3. **Ensure the standards-researcher is also done** before proceeding (check task 1)

---

## Step 3: Spawn Phase 2 — Code Worker (Pattern Fixes on Simplified Code)

Only start after BOTH the code-simplifier (task 3) and standards-researcher (task 1) are complete.

The code-worker receives the researcher's full knowledge report and applies it to the now-simplified codebase.

```
Task:
  name: "code-worker"
  subagent_type: general-purpose
  team_name: "deep-clean"
  run_in_background: true
  mode: "bypassPermissions"
```

**Code worker prompt** (include the researcher's actual knowledge report):

```
You are the CODE WORKER for a deep-clean audit of `$ARGUMENTS`.
Code type: $CODE_TYPE.

The code has already been simplified. Your job is to scan for and fix framework pattern violations, using the standards knowledge below.

## Standards Knowledge (from researcher)

$RESEARCHER_KNOWLEDGE_REPORT

(Paste the FULL output from the standards-researcher here — includes standards checklist, Context7 findings, Vercel rules, and the prioritized "What to Look For" list.)

## Your Tasks

### 1. Scan source files for violations
Read every source file in `$ARGUMENTS` (NOT test files).
For each file, check against the researcher's "What to Look For" list and identify:

1. **Pattern violations** — deviations from project standards
2. **Framework misuse** — Effect/React patterns used incorrectly
3. **Missing authorization** — mutation use cases without ownership checks (backend)
4. **Accessibility gaps** — missing aria-labels, labels, document.title (frontend)

### 2. Fix violations by priority
Address violations in order of severity (critical → high → medium → low):

**Backend (Effect TS):**
- Fix `Schema.TaggedError` usage for domain errors (must have httpStatus, httpCode, httpMessage, logLevel)
- Fix authorization gaps in mutation use cases (add `requireOwnership`)
- Replace `as any` / `as unknown as` with proper types
- Replace `console.log` with `Effect.log`
- Use Effect-based serializers instead of sync ones
- Add `{ concurrency: 'unbounded' }` to independent `Effect.all` calls
- Add `acquireRelease` / cleanup for multi-step operations
- Fix repository patterns (one repo per entity, Context.Tag/Layer)

**Frontend (React):**
- Fix loader patterns (every route needs `queryClient.ensureQueryData`)
- Fix component architecture (container/presenter split)
- Fix data fetching patterns (TanStack Query)
- Fix mutation patterns (useXxxActions hooks)

### 3. Apply Context7 findings
If the researcher found updated APIs, deprecated patterns, or new best practices from Context7, apply them.

### 4. Verify after changes
Run tests after your changes:
pnpm vitest run --reporter=verbose $ARGUMENTS
If anything breaks, fix it immediately. Do NOT leave broken tests.

### 5. Produce your summary
Your FINAL output must include:
- Files scanned: (count)
- Violations found: (count by category and severity)
- Violations fixed: (bullet list with file:line and what was changed)
- Context7 patterns applied: (list)
- Any regressions encountered and how they were resolved

## Rules
- Never use `as any` or `as unknown as` — fix types properly
- Never add `console.log` — use `Effect.log` for backend
- Don't over-engineer — the goal is compliance, not gold-plating
- Don't modify test files — the test-auditor already handled those
- Commit nothing
```

### Wait for Phase 2

When the code-worker completes:
1. Read its summary
2. Mark task 4 as completed via `TaskUpdate`

---

## Step 4: Spawn Phase 3 — UX Worker (Frontend Only)

**Skip this phase if the code type is backend only.**

Only start after the code-worker (task 4) completes.

```
Task:
  name: "ux-worker"
  subagent_type: general-purpose
  team_name: "deep-clean"
  run_in_background: true
  mode: "bypassPermissions"
```

**UX worker prompt:**

```
You are the UX WORKER for a deep-clean audit of `$ARGUMENTS`.

The code has been simplified and pattern violations have been fixed. Your job is the final polish: accessibility and UI/UX.

## Your Tasks

### 1. Fetch Web Interface Guidelines
Use WebFetch to retrieve:
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

Review each .tsx component file in `$ARGUMENTS` against these guidelines.

### 2. Read Vercel skill rules
Read rule files from:
- .agents/skills/vercel-react-best-practices/rules/ (CRITICAL and HIGH priority)
- .agents/skills/vercel-composition-patterns/rules/

### 3. Fix accessibility violations
- Every icon button needs `aria-label`
- Every input needs a label (visible or sr-only)
- Every page/route sets `document.title`
- Every delete action has a `ConfirmationDialog`
- No non-functional interactive elements (if no handler, hide it)
- Proper focus management and keyboard navigation
- Semantic HTML elements

### 4. Fix UI/UX patterns
- Fix boolean prop proliferation → composition/variants
- Fix missing compound component patterns
- Remove `forwardRef` → use React 19 ref prop pattern
- Fix re-render issues (unnecessary state, missing memoization for expensive computations)
- Fix bundle issues (lazy-load heavy third-party libraries)
- Use refs for high-frequency transient values (e.g., audio currentTime)

### 5. Verify after changes
Run: pnpm vitest run --reporter=verbose $ARGUMENTS
Fix any regressions.

### 6. Produce your summary
Your FINAL output must include:
- Accessibility issues fixed: (list)
- UI/UX improvements: (list)
- Composition pattern changes: (list)
- Files modified: (list)
```

### Wait for Phase 3

When the ux-worker completes:
1. Read its summary
2. Mark task 5 as completed via `TaskUpdate`

---

## Step 5: Final Verification (Lead)

You (the lead) run all verification commands:

```bash
pnpm vitest run --reporter=verbose $ARGUMENTS
```

```bash
pnpm typecheck
```

```bash
pnpm lint
```

If anything fails:
- For test failures: determine which agent introduced the regression and fix it yourself
- For type errors: fix them yourself
- For lint errors: fix them yourself

Re-run until everything passes.

Mark task 6 as completed.

---

## Step 6: Report & Self-Improvement (Lead)

### 6a: Generate the Report

Compile findings from all agents into a single report:

```
### Deep Clean Report: `$ARGUMENTS`

**Tests** (from test-auditor)
- Tests before: X passing, Y failing, Z missing
- Tests after: X passing, Y added, Z improved
- Key test improvements: (bullet list)

**Code Simplification** (from code-simplifier)
- Files simplified: N
- Lines removed: ~N
- Key simplifications: (bullet list)

**Framework Patterns** (from code-worker + standards-researcher)
- Violations found and fixed: N
- Key pattern improvements: (bullet list)
- Context7 patterns applied: (list)

**UI/UX** (from ux-worker, if applicable)
- Accessibility issues fixed: N
- Design guideline violations fixed: N

**Verification**
- All tests: PASS / FAIL
- Typecheck: PASS / FAIL
- Lint: PASS / FAIL

**Learnings Captured**
- Memory files updated: (list files changed)
- New patterns documented: (bullet list)
- AI anti-patterns found: (bullet list)
- Standards update suggestions: (bullet list, if any)
```

### 6b: Update Memory (Lead Only)

Review all agent reports for learnable patterns. Only you (the lead) update memory files to avoid conflicts.

1. **Update auto-memory files** at `/Users/brandon/.claude/projects/-Users-brandon-Development-content-studio/memory/`:
   - Add new gotchas to `MEMORY.md` (keep under 200 lines)
   - Add testing patterns to `testing-effect-ts.md`, `testing-react.md`, or `testing-integration-orpc.md`
   - Add AI anti-patterns to `ai-anti-patterns.md`
   - Create new topic files if needed

2. **Update pre-existing failure list** in `MEMORY.md` if any known failures were resolved or new persistent ones were discovered.

3. **Suggest standards updates** — if a pattern violation appeared in 3+ files and the fix was consistent, present the suggestion to the user (don't modify standards files without approval).

4. **Log Context7 findings** — if Context7 revealed updated APIs or deprecated patterns that differ from what's in memory/standards, update memory with the correct pattern and note the old one for migration.

### 6c: Shutdown Team

Send `shutdown_request` to all active teammates, then:

```
TeamDelete
```

---

## AI Anti-Patterns Reference

Pass this table to agents in their prompts (replace `$AI_ANTI_PATTERNS_TABLE`):

| Anti-Pattern | What It Looks Like | Fix |
|---|---|---|
| Over-abstraction | Utility function used exactly once, premature `createXxxFactory` wrappers | Inline it. Three similar lines > a premature abstraction. |
| Defensive over-engineering | Try/catch around code that can't throw, null checks on non-nullable types, fallback values for required fields | Remove. Trust internal code and framework guarantees. |
| Comment narration | `// Get the user` above `getUser()`, `// Return the result` above `return result` | Delete. Comments should explain *why*, never *what*. |
| Unnecessary type annotations | Explicit return types on simple functions where TS infers correctly, redundant `as const` | Remove annotations where inference is sufficient. |
| Gratuitous `async/await` | `async` on functions that don't await anything, `await` on non-Promise values | Remove the `async`/`await`. |
| Empty error handling | `catch (e) { throw e }`, `catch (e) { console.log(e); throw e }` | Remove the catch — let it propagate naturally. |
| Backwards-compat shims | `// removed`, `_unusedVar`, re-exports of deleted items | Delete completely. No tombstones. |
| Boolean prop sprawl | `<Component isLoading isError isDisabled hasIcon />` | Composition patterns, variant components, or enums. |
| Premature feature flags | Config options for things that have exactly one value | Hardcode it. Add config when a second consumer appears. |
| Test theater | Tests that assert implementation details (`toHaveBeenCalledWith` on internal helpers), mock everything, or test framework behavior | Test behavior and outcomes, not implementation. |

When agents find new anti-patterns not in this table, they should include them in their summary. If the same anti-pattern appears across 3+ directories over multiple runs, add it to this table.

---

## Important Rules

- **Never delete tests to make them pass.** Fix the code or fix the test.
- **Never use `as any` or `as unknown as`** — fix types properly.
- **Never add `console.log`** — use `Effect.log` for backend.
- **Don't over-engineer.** The goal is simplification, not adding complexity.
- **Commit nothing.** The user will review and commit when satisfied.
- **If a phase has no applicable work** (e.g., no frontend code for UX worker), skip it and note that in the report.
- **Known pre-existing failures** (from memory): `podcast-workflow.test.ts`, `podcast.integration.test.ts`, `document-list.test.tsx`, `podcast-list.test.tsx`, `voiceover-detail.test.tsx` — note these but don't try to fix unrelated infrastructure issues.
- **Only the lead updates memory files** — agents report findings, lead persists them.
- **Agents must include full summaries in their final output** — the lead uses these to compile the report.
