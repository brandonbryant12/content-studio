---
description: Interview user and create an implementation plan following project standards
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion, Write, Edit, Task, WebSearch, WebFetch
model: opus
thinking-budget: very-high
---

# Create Implementation Plan

Take a user request, interview them to gather requirements, explore the codebase, and create a comprehensive implementation plan following `/standards/implementation-plan.md`.

## User Request

$ARGUMENTS

## Instructions

### Phase 1: Understand the Request

1. **Read the implementation plan standard** to understand the format:
   ```
   Read /standards/implementation-plan.md
   ```

2. **Analyze the user's request** and identify:
   - What domain/feature area does this touch?
   - Is this a new feature, refactor, bug fix, or infrastructure change?
   - What's the rough scope (small, medium, large)?

3. **Explore relevant codebase areas** using Task with subagent_type='Explore':
   - Find existing patterns in the area being modified
   - Identify files that will likely need changes
   - Understand current architecture

### Phase 2: Interview the User

Use AskUserQuestion to gather missing information. Focus on questions that will affect implementation decisions.

**Core Questions to Consider:**

1. **Scope Clarification**
   - "What's the minimum viable version of this feature?"
   - "Are there parts of this we should explicitly NOT do?"

2. **Technical Decisions**
   - "Should we follow pattern X (like in existing code) or try approach Y?"
   - "Any specific libraries/tools you want to use or avoid?"

3. **Constraints**
   - "Any performance requirements?"
   - "Does this need to work with existing data/migrations?"
   - "Any backwards compatibility concerns?"

4. **Acceptance Criteria**
   - "How will we know this is done?"
   - "What should we be able to test?"

**Interview Guidelines:**
- Ask 2-4 questions at a time maximum (use multi-question AskUserQuestion)
- Don't ask questions you can answer by reading the codebase
- Stop interviewing when you have enough to write a specific plan
- If the user's initial request is very detailed, you may skip some questions

### Phase 3: Create the Implementation Plan

After gathering enough information, create the implementation plan.

1. **Determine file location:**
   - For project-wide work: `/IMPLEMENTATION_PLAN.md`
   - For feature-specific work: `/docs/plans/{feature-name}.md`

2. **Write the plan** following the standard format from `/standards/implementation-plan.md`:

   ```markdown
   # [Feature] Implementation Plan

   > **STATUS: NOT STARTED**

   ## Overview
   [2-3 sentences describing the goal]

   ## Key Decisions
   | Decision | Choice |
   |----------|--------|
   | [Area] | [Choice] |

   ## Validation Commands
   [Package-specific and full validation commands]

   ---

   ## Target Architecture
   [Directory structure with comments]

   ---

   ## Step 0: Familiarize with Standards
   [Reading phase - list relevant standards and files to review]

   ---

   ## Sprint 1: [Name]
   **Goal**: [One sentence]

   ### 1.1 [Task]
   [Description]

   **Validation**: `[command]`

   ---

   [Additional sprints...]

   ---

   ## Key Files to Modify
   | File | Action |
   |------|--------|
   | `path` | [Action] |

   ---

   ## Success Criteria
   - [ ] **Sprint 1**: [Outcome]
   - [ ] **Sprint 2**: [Outcome]

   ---

   ## Standards Reference
   - `/standards/[relevant].md` - [Description]
   ```

3. **Sprint Sizing Guidelines:**
   - Each sprint should be 1-2 hours of focused work
   - 2-6 sub-tasks per sprint
   - One clear goal per sprint
   - Include validation command at the end of each sprint

4. **After writing the plan:**
   - Show the user the file path and summarize:
     - Total number of sprints
     - Estimated scope (small/medium/large)
     - Key architectural decisions made
   - The task is complete - do not offer to start implementation

## Quality Checklist

Before finalizing the plan, verify:

- [ ] Status banner is present
- [ ] Overview is 2-3 sentences
- [ ] Validation commands section exists with specific commands
- [ ] Target architecture shows directory structure
- [ ] Step 0 includes reading relevant standards
- [ ] Each sprint has one clear goal
- [ ] Each sprint ends with a validation command
- [ ] Key files table lists all files to modify
- [ ] Success criteria has checkboxes for each sprint
- [ ] Standards reference links relevant docs

## Example Interview Flow

**User Request:** "Add dark mode to the app"

**Round 1 Questions:**
1. "Should dark mode be system-preference-aware, manual toggle, or both?"
2. "Where should the toggle live - settings page, header, or both?"

**After Codebase Exploration:**
3. "I see you're using Tailwind. Should we use CSS variables for theming or Tailwind's dark: prefix?"
4. "Should the preference persist to the database (synced across devices) or just localStorage?"

**After Answers → Write Plan**
