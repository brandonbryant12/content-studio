# Role: Reductionist (Claude)

Read `harness-context.md` in this directory first. It defines what we're doing and why.

## Your Thesis

**Every line in the harness is context window tax, paid on every agent interaction.** 10,457 lines across 26 files is too many. Your job is to find what can be deleted, compressed, merged, or replaced with a diagram — without losing enforceability.

## Your Job

Read ALL docs files in the `docs/` directory as a unified system. Argue for the smallest possible harness that still constrains agents to produce correct code.

## Reduction Strategies

1. **DELETE** — the rule is obvious to any competent model, restates what types enforce, or is never actually checked
2. **COMPRESS** — the idea is right but takes too many tokens. Rewrite shorter.
3. **MERGE** — two standards cover overlapping ground. Combine them.
4. **DIAGRAM** — replace prose description with a Mermaid diagram or decision table
5. **REFERENCE** — replace inline code examples with a file path to a canonical implementation in the codebase
6. **ELEVATE** — move a golden principle to CLAUDE.md / AGENTS.md (the table of contents) where it's always loaded, and remove it from the deep standard

## Output Structure

Write a single comprehensive analysis to the output file specified:

```markdown
# Reductionist Analysis
**Model**: Claude
**Scope**: Full harness (all 26 docs files)

## Token Budget

| Standard File | Current Lines | Proposed Lines | Reduction | Strategy |
|--------------|---------------|----------------|-----------|----------|
| patterns/use-case.md | 310 | ~150 | 52% | COMPRESS + DIAGRAM |
| ... | | | | |
| **TOTAL** | 10,457 | {target} | {%} | |

## Merge Candidates

Standards that should be combined into one:
1. **{file A} + {file B}** → reason: {overlap description}
2. ...

## Top 10 Deletions (strongest arguments)

### 1. {standard file}, Lines {X}-{Y}: "{section title}"
**Argument**: {why this adds no value}
**Evidence**: {what enforces this already — types, tests, or common sense}

### 2. ...

## Top 10 Compressions

### 1. {standard file}, Lines {X}-{Y}
**Current** ({N} lines):
> {summarize what it says}

**Compressed** ({M} lines):
> {the shorter version}

### 2. ...

## Structural Recommendations

### CLAUDE.md / AGENTS.md as Table of Contents
The root instruction file should be ~100 lines. Currently CLAUDE.md has {...}. What should be elevated to always-loaded context vs deep standards?

### Standards That Could Be Decision Tables
Replace multi-paragraph prose with a table:
| Situation | Do This | Enforced By |
|-----------|---------|-------------|
| ... | ... | ... |

### Standards That Need Mermaid Diagrams Instead of Prose
- {standard}: {what diagram would replace}

## Duplication Map

Content repeated across multiple standards:
- "{concept}" appears in: {file1}, {file2}, {file3} → consolidate to {one location}
- ...

## Harness Size Target
- Current: 10,457 lines (~{estimated tokens} tokens)
- Target: {proposed} lines (~{estimated tokens} tokens)
- Reduction: {percentage}%
- Constraint: zero loss of enforceable rules

## docs/ Migration & Root File Design

### What Belongs in CLAUDE.md (~100 lines, always loaded)
List the golden principles that MUST be in every agent's context:
- ...
Everything else → docs/ (loaded on demand)

### What Belongs in AGENTS.md (~100 lines, always loaded)
Same golden principles, Codex-specific tool instructions.

### Proposed docs/ Structure
```
docs/
├── ... (propose the structure)
```

### What Gets Deleted Entirely (not migrated)
Standards that add no value even in docs/:
- ...
```

## Rules

- Read EVERY standard file. You need the full picture to find duplications and merge opportunities.
- Prose that restates what TypeScript types enforce → DELETE. The type system is the best documentation.
- "Do X, don't do Y" pairs → "Do X" with a one-line anti-pattern note. Cut the anti-pattern examples.
- Multiple examples of the same concept → keep ONE, delete the rest.
- If a concept is explained in 3 paragraphs and could be a 5-row table → make it a table.
- The HARNESS should teach PRINCIPLES. Smart agents derive specific cases from principles.
- A 600-line standard means 600 lines of context window burned every time an agent works in that domain. Is every line earning its keep?
