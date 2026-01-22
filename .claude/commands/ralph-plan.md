---
description: Interview user and create an implementation plan following project standards
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion, Write, Edit, Task, WebSearch, WebFetch
model: opus
thinking-budget: very-high
---

# Create Implementation Plan

Take a user request, conduct a thorough investigation, interview them comprehensively, and create a detailed implementation plan in `.claude/ralph-plans/`.

## User Request

$ARGUMENTS

---

## Phase 1: Deep Codebase Exploration

Before asking ANY questions, deeply understand the codebase context.

### 1.1 Read Core Standards

```
Read /standards/implementation-plan.md     # The plan format we'll create
Read /standards/README.md                  # Standards overview
Read /standards/overview.md                # Project architecture
```

### 1.2 Explore Relevant Areas

Launch up to 5 Explore agents IN PARALLEL to understand:

1. **Existing patterns** - How similar features are implemented
2. **Related code** - Files that will likely be affected
3. **Dependencies** - What packages/modules are involved
4. **Testing patterns** - How similar features are tested
5. **Data flow** - How data moves through the system

For each exploration, note:
- File paths discovered
- Patterns observed
- Potential challenges
- Reusable code

### 1.3 Identify Standards

Based on exploration, identify which standards apply:

| Area | Standards to Apply |
|------|-------------------|
| Backend | `standards/patterns/*.md` |
| Frontend | `standards/frontend/*.md` |
| Testing | `standards/testing/*.md` |

---

## Phase 2: Comprehensive Interview

Ask questions iteratively until you have complete clarity. **Do not rush this phase.**

### Interview Rounds

Conduct multiple rounds of questions. Each round should build on previous answers.

**Round 1: Core Understanding**
- What problem are we solving?
- Who/what is the user of this feature?
- What's the expected behavior from the user's perspective?

**Round 2: Scope & Boundaries**
- What's explicitly IN scope?
- What should we explicitly AVOID?
- Are there related features we should NOT touch?
- Any backwards compatibility concerns?

**Round 3: Technical Decisions**
- Should we follow existing pattern X or try something new?
- Any performance requirements or constraints?
- Any security considerations?
- Does this need to work with existing data/migrations?

**Round 4: Edge Cases & Errors**
- What happens when X fails?
- How should we handle Y edge case?
- What error messages should users see?

**Round 5: Success Criteria**
- How will we know this is done?
- What should we be able to test/demonstrate?
- Any specific acceptance criteria?

### Interview Guidelines

- Ask 2-4 questions per round (use AskUserQuestion tool)
- Don't ask questions you can answer by reading code
- Build on previous answers - reference what they said
- If an answer is vague, probe deeper
- Stop when you have enough detail to write specific acceptance criteria
- It's OK to conduct 3-5+ rounds if needed for complex features

### Interview Quality Checklist

Before moving to Phase 3, verify you can answer:

- [ ] What exactly are we building?
- [ ] What files will we modify?
- [ ] What new files will we create?
- [ ] What patterns should we follow?
- [ ] What are the specific acceptance criteria for each task?
- [ ] What should we test?
- [ ] What error cases should we handle?

---

## Phase 3: Plan Architecture

Design the implementation approach before writing.

### 3.1 Identify Tasks

Break the work into discrete tasks. Each task should:
- Have a single clear goal
- Be completable in one loop iteration
- Have verifiable acceptance criteria
- Reference specific standards

### 3.2 Determine Task Order

Consider dependencies:
- What must be done first? (infrastructure, schemas)
- What can be done in parallel? (split if needed)
- What depends on what?

### 3.3 Map Standards to Tasks

| Task | Standards Required |
|------|-------------------|
| Task 01: ... | `standards/patterns/repository.md` |
| Task 02: ... | `standards/frontend/components.md` |

---

## Phase 4: Create Plan Directory

### 4.1 Determine Plan Name

- Use kebab-case: `{category}-{description}`
- Categories: `feat-`, `fix-`, `refactor-`, `infra-`
- Examples:
  - `feat-dark-mode`
  - `feat-user-authentication`
  - `refactor-podcast-generation`
  - `fix-search-pagination`
  - `infra-ci-pipeline`

### 4.2 Create Directory Structure

```bash
mkdir -p .claude/ralph-plans/{plan-name}/tasks
mkdir -p .claude/ralph-plans/{plan-name}/issues
```

### 4.3 Create Main File

Write `.claude/ralph-plans/{plan-name}/implementation_plan.md`:

```markdown
# [Feature] Implementation Plan

> **STATUS: NOT_STARTED**

## Overview

[2-3 sentences from user interview - what we're building and why]

## Validation Commands

\`\`\`bash
# Package-specific (adjust based on affected packages)
pnpm --filter [package] typecheck
pnpm --filter [package] test

# Full validation
pnpm typecheck && pnpm build && pnpm test
\`\`\`

## Issues

<!-- Agent checks this section each pass for user-created issues -->
| Issue | Status | Notes |
|-------|--------|-------|
| _No issues_ | | |

---

## Tasks

### Task 01: [Name]
**Status:** ⏳ NOT_STARTED
**Standards:** `standards/[specific].md`, `standards/[another].md`
**Acceptance Criteria:**
- [ ] [Specific, verifiable criterion from interview]
- [ ] [Another specific criterion]
- [ ] [Test requirement]
**Details:** [01-name.md](./tasks/01-name.md)

---

[Additional tasks...]

---

### Task 99: Final Verification
**Status:** ⏳ NOT_STARTED
**Standards:** All standards referenced in prior tasks
**Acceptance Criteria:**
- [ ] All prior tasks verified by subagent review
- [ ] No standards violations found
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes
**Details:** [99-final-verification.md](./tasks/99-final-verification.md)

---

## Success Criteria

- [ ] **Task 01**: [Outcome from interview]
- [ ] **Task 02**: [Outcome]
- [ ] **Task 99**: All code verified against standards
```

### 4.4 Create Task Sub-Files

For each task, create `.claude/ralph-plans/{plan-name}/tasks/{NN}-{name}.md`:

```markdown
# Task NN: [Name]

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/[specific].md`
- [ ] `standards/[another].md`

## Context

[Detailed context from exploration phase:]
- Related existing code: `path/to/file.ts`
- Pattern to follow: [describe]
- Key considerations: [from interview]

## Key Files

- `path/to/file.ts` - [What to do here]
- `path/to/another.ts` - [What to do here]

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
```

### 4.5 Create Final Verification Task

Always create `.claude/ralph-plans/{plan-name}/tasks/99-final-verification.md`:

```markdown
# Task 99: Final Verification

## Standards Checklist

Review ALL standards referenced across all prior tasks:
- [ ] [List all standards from all tasks]

## Verification Scope

Launch up to 5 subagents to verify:
1. Effect patterns (Schema.TaggedError, Context.Tag, etc.)
2. Repository patterns (Drizzle queries, not raw SQL)
3. Frontend patterns (Container/Presenter, TanStack Query)
4. Testing patterns (fixtures, Effect integration)
5. Error handling (HTTP protocol properties)

## Subagent Results

<!-- Agent writes results from each subagent -->

## Final Status

- [ ] All subagents passed
- [ ] No tasks reopened
- [ ] Validation commands pass
```

---

## Phase 5: Present Plan

After writing the plan:

### 5.1 Summarize to User

Present a clear summary:
- Plan location: `.claude/ralph-plans/{plan-name}/`
- Number of tasks
- Key architectural decisions
- Standards that will be applied

### 5.2 Show Execution Command

```bash
./loop.sh .claude/ralph-plans/{plan-name}/
```

### 5.3 Offer Review

Ask if user wants to review any specific task or make adjustments before execution.

---

## Quality Checklist

Before finalizing, verify:

- [ ] Plan directory created with correct structure
- [ ] Main file has status banner
- [ ] Each task has specific, verifiable acceptance criteria
- [ ] Each task references relevant standards
- [ ] Each task has a sub-file with context
- [ ] Task 99 (Final Verification) is included
- [ ] Success criteria match interview outcomes
- [ ] Validation commands are correct for affected packages

---

## Anti-Patterns to Avoid

### 1. Rushing the Interview

```
# BAD: Asking one vague question then moving on
"What do you want to build?"
[User gives brief answer]
[Immediately start writing plan]
```

```
# GOOD: Multiple rounds of probing questions
Round 1: "What problem are we solving?"
Round 2: "You mentioned X - should it also handle Y?"
Round 3: "What happens when Z fails?"
Round 4: "How will we test the Y behavior?"
```

### 2. Vague Acceptance Criteria

```
# BAD
- [ ] Feature works correctly
```

```
# GOOD
- [ ] Toggle component renders with initial state from localStorage
- [ ] Click toggles between light/dark themes
- [ ] Theme preference persists across page reload
- [ ] Unit test covers toggle state transitions
```

### 3. Missing Standards References

Every task MUST reference specific standards. If you can't identify which standards apply, explore the codebase more.

### 4. Skipping Exploration

Don't ask questions you could answer by reading code. Explore first, then ask about decisions that require user input.

---

## Example Interview Flow

**User Request:** "Add dark mode to the app"

**Round 1 (Core):**
1. "Should dark mode be system-preference-aware, manual toggle, or both?"
2. "Where should the toggle live - settings page, header, or both?"

**Round 2 (Technical - after exploration):**
3. "I see we're using Tailwind. Should we use CSS variables for theming or Tailwind's dark: prefix?"
4. "Should the preference persist to the database (synced across devices) or just localStorage?"

**Round 3 (Edge Cases):**
5. "Should there be a transition animation when switching themes?"
6. "How should we handle components that have explicit colors (like brand colors)?"

**Round 4 (Testing):**
7. "Should we add visual regression tests for dark mode?"
8. "Any specific components we should prioritize testing?"

**After thorough interview → Write detailed plan with specific acceptance criteria**

---

## Completion

After the plan is written:
1. Show the user the plan location
2. Show the command to run: `./loop.sh .claude/ralph-plans/{plan-name}/`
3. Do NOT offer to start implementation - the task is complete
