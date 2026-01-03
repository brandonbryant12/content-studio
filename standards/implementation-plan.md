# Writing Implementation Plans

Guidelines for creating effective PRD/Implementation plans that Claude can execute iteratively.

## Why Implementation Plans Matter

A well-structured implementation plan:
1. **Reduces context loss** - Clear checkpoints let work resume across sessions
2. **Enables validation** - Each sprint has concrete verification steps
3. **Maintains momentum** - Small, focused sprints prevent scope creep
4. **Documents decisions** - Captures architectural choices for future reference

## Document Structure

### 1. Status Banner

Always include a status banner at the top:

```markdown
# Feature Implementation Plan

> **STATUS: IN PROGRESS** - Sprint 3 complete, Sprint 4 next
> - Previous phase complete (archived)
> - Current focus: [specific goal]
```

Update this as work progresses. Include:
- Current sprint number
- What's already done
- What's being worked on

### 2. Overview

One paragraph describing the high-level goal:

```markdown
## Overview

Refactor the frontend to follow documented standards with feature-based
organization, Container/Presenter pattern, and optimistic mutation factory.
```

Keep it to 2-3 sentences. This orients anyone reading the plan.

### 3. Key Decisions Table (Optional)

For complex work, document decisions upfront:

```markdown
## Key Decisions

| Decision | Choice |
|----------|--------|
| State management | TanStack Query (not Redux) |
| Component pattern | Container/Presenter |
| Error handling | Hybrid protocol + overrides |
```

This prevents re-debating decisions during implementation.

### 4. Validation Commands

**Critical section** - every plan MUST include this:

```markdown
## Validation Commands

After each change, run these commands to validate:

\`\`\`bash
# Type check and build
pnpm --filter web typecheck
pnpm --filter web build

# Run tests
pnpm --filter web test

# Full validation
pnpm typecheck && pnpm test && pnpm build
\`\`\`
```

Rules:
- Include package-specific commands when relevant
- Specify validation checkpoints (e.g., "after creating X, run Y")
- Full validation command for before-commit checks

### 5. Target Architecture

Visual directory structure showing the end state:

```markdown
## Target Architecture

\`\`\`
apps/web/src/
├── features/
│   ├── podcasts/
│   │   ├── components/
│   │   │   ├── podcast-detail-container.tsx    # Container
│   │   │   └── podcast-detail.tsx              # Presenter
│   │   └── hooks/
│   │       └── use-podcast.ts                  # useSuspenseQuery
│   └── documents/
└── shared/
    └── hooks/
        └── use-optimistic-mutation.ts          # Factory hook
\`\`\`
```

Add inline comments explaining the purpose of key files.

### 6. Step 0: Familiarize with Standards

Always start with a reading phase:

```markdown
## Step 0: Familiarize with Standards

**Goal**: Read and understand all relevant standards before implementation

### Read Core Standards
- [ ] `/standards/frontend/components.md` - Container/Presenter pattern
- [ ] `/standards/frontend/data-fetching.md` - TanStack Query patterns

### Review Current Implementation
- [ ] `apps/web/src/routes/_protected/podcasts/$podcastId.tsx` - Main file to refactor

**No code changes in this sprint** - understanding only.
```

This prevents jumping into code without understanding the patterns.

### 7. Sprints

Break work into small, focused sprints (1-2 hours of work each):

```markdown
## Sprint 1: Foundation

**Goal**: Create shared infrastructure

### 1.1 Create `shared/hooks/use-optimistic-mutation.ts`
Factory hook that all feature mutations will use:
- `queryKey`, `mutationFn`, `getOptimisticData`
- Auto rollback on error
- Toast integration

### 1.2 Create `shared/components/suspense-boundary.tsx`
Combines ErrorBoundary + Suspense with default spinner fallback

**Validation**: `pnpm --filter web typecheck` ✅ PASSED

---

## Sprint 2: Feature Hooks ✅ COMPLETE

**Goal**: Create feature-based hooks
...
```

Sprint rules:
- **One clear goal** per sprint
- **Numbered sub-tasks** (1.1, 1.2, etc.)
- **Bullet points** describing what each task involves
- **Validation command** at the end of each sprint
- **Mark complete** with ✅ when done
- **Horizontal rule** between sprints for visual separation

### 8. Migration Tables

When moving/renaming files, use tables:

```markdown
### 1.4 Move shared code to `/shared/`

| From | To |
|------|-----|
| `src/components/error-boundary/` | `src/shared/components/error-boundary/` |
| `src/lib/errors.ts` | `src/shared/lib/errors.ts` |
```

### 9. Interface Examples

For components/hooks, show the target interface:

```markdown
### 3.2 Create `PodcastDetail` presenter

**Presenter responsibilities** (pure UI):

\`\`\`typescript
interface PodcastDetailProps {
  podcast: Podcast;
  hasChanges: boolean;
  isGenerating: boolean;
  onSave: () => void;
  onGenerate: () => void;
}
\`\`\`
```

This clarifies expectations without writing full implementation.

### 10. Key Files Table

Summarize all files that will be modified:

```markdown
## Key Files to Modify

| File | Action |
|------|--------|
| `apps/web/src/routes/_protected/podcasts/$podcastId.tsx` | Replace 263-line component with thin route |
| `apps/web/src/hooks/use-script-editor.ts` | Move to features |
| `apps/web/src/db/hooks.ts` | Replace with feature hooks |
```

### 11. Success Criteria

Checklist of what "done" looks like:

```markdown
## Success Criteria

- [x] **Sprint 1**: Factory hook + SuspenseBoundary + shared structure
- [x] **Sprint 2**: All podcast hooks in `features/podcasts/hooks/`
- [ ] **Sprint 3**: `$podcastId.tsx` < 30 lines, Container/Presenter split
- [ ] **Sprint 4**: Old code removed, all imports updated

Each sprint maintains working functionality with passing build.
```

### 12. Standards Reference

Link to relevant standards:

```markdown
## Standards Reference

- `/standards/frontend/components.md` - Container/Presenter pattern
- `/standards/frontend/data-fetching.md` - useSuspenseQuery patterns
- `/standards/frontend/mutations.md` - Optimistic mutation factory
```

---

## Sprint Sizing Guidelines

| Sprint Size | Characteristics | Example |
|-------------|-----------------|---------|
| **Small** | 2-4 sub-tasks, single file type | Create utility hook |
| **Medium** | 4-6 sub-tasks, multiple files | Refactor single component |
| **Large** | 6-8 sub-tasks, cross-cutting | Feature module setup |

Aim for small-to-medium sprints. Large sprints should be rare.

---

## Anti-Patterns to Avoid

### 1. Vague Goals
```markdown
# BAD
## Sprint 1: Set up infrastructure
```

```markdown
# GOOD
## Sprint 1: Foundation
**Goal**: Create shared infrastructure (factory hook + SuspenseBoundary)
```

### 2. Missing Validation
```markdown
# BAD
## Sprint 1: Create hooks
### 1.1 Create use-podcast.ts
### 1.2 Create use-podcast-list.ts
(no validation step)
```

```markdown
# GOOD
## Sprint 1: Create hooks
### 1.1 Create use-podcast.ts
### 1.2 Create use-podcast-list.ts
**Validation**: `pnpm --filter web typecheck` ✅ PASSED
```

### 3. Monolithic Sprints
```markdown
# BAD
## Sprint 1: Refactor Everything
1. Create all hooks
2. Create all components
3. Update all routes
4. Add all tests
5. Update all imports
```

```markdown
# GOOD
## Sprint 1: Shared Infrastructure
## Sprint 2: Feature Hooks
## Sprint 3: Container/Presenter Split
## Sprint 4: Route Updates
## Sprint 5: Cleanup
```

### 4. No Context on Current State
```markdown
# BAD
## Overview
We need to refactor the frontend.
```

```markdown
# GOOD
## Overview
Refactor the Content Studio frontend to follow documented standards
with feature-based organization, Container/Presenter pattern,
Suspense-first data fetching, and optimistic mutation factory.

## Current State Analysis
| Area | Issue |
|------|-------|
| Components | God components with 200+ lines |
| Data fetching | Inconsistent patterns |
```

---

## Template

```markdown
# [Feature] Implementation Plan

> **STATUS: NOT STARTED**

## Overview

[2-3 sentence description of what this plan accomplishes]

## Key Decisions

| Decision | Choice |
|----------|--------|
| [Area] | [Choice] |

## Validation Commands

\`\`\`bash
# Package-specific
pnpm --filter [package] typecheck
pnpm --filter [package] test

# Full validation
pnpm typecheck && pnpm test && pnpm build
\`\`\`

---

## Target Architecture

\`\`\`
[Directory structure with inline comments]
\`\`\`

---

## Step 0: Familiarize with Standards

**Goal**: Read and understand all relevant standards

### Read Standards
- [ ] `/standards/[relevant].md`

### Review Current Implementation
- [ ] `[file to understand]`

**No code changes** - understanding only.

---

## Sprint 1: [Name]

**Goal**: [One sentence]

### 1.1 [Task]
[Description with bullet points]

### 1.2 [Task]
[Description]

**Validation**: `[command]`

---

## Key Files to Modify

| File | Action |
|------|--------|
| `path/to/file` | [What to do] |

---

## Success Criteria

- [ ] **Sprint 1**: [Outcome]
- [ ] **Sprint 2**: [Outcome]

Each sprint maintains working functionality with passing build.

---

## Standards Reference

- `/standards/[relevant].md` - [Description]
```

---

## Updating the Plan

As work progresses:

1. **Update status banner** after each sprint
2. **Mark tasks complete** with ✅
3. **Add notes** about deviations or discoveries
4. **Insert new sprints** if scope expands (but prefer new plan)
5. **Archive old plans** when starting new phase

Example update:
```markdown
### 2.6 Update shared factory hook ✅
- `useOptimisticMutation` now uses `MutationFunction` type for TanStack Query compatibility
- **Note**: Also had to update toast types for compatibility

**Validation**: `pnpm --filter web typecheck && pnpm --filter web build` ✅ PASSED
```
