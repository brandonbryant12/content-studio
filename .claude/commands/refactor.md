---
description: Iteratively refactor code following Effect patterns, then auto-ship
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Skill, Task, WebFetch, WebSearch, AskUserQuestion
argument-hint: "[--plan] [--think] <description>"
---

# Refactor Loop

This skill starts an iterative development loop for refactoring code.
The stop hook will feed the same prompt back after each iteration until you
output `<promise>READY TO SHIP</promise>`, then automatically run /ship.

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--plan` | `-p` | Explore codebase and create refactoring plan first |
| `--think` | `-t` | Enable extended thinking (ultrathink) mode |
| `--max N` | | Set max iterations (default: 30) |

Options can be combined: `-pt` or `--plan --think`

## Setup

Run the setup script to initialize the loop:

```bash
.claude/scripts/setup-dev-loop.sh refactor $ARGUMENTS
```

## How This Works

1. **Planning (if --plan)**: Explore code, create refactoring plan, get approval
2. **Iterative Refactoring**: Make changes incrementally
3. **Stop Hook**: When you try to exit, the hook feeds the prompt back
4. **See Previous Work**: Check git status and files to see what you did before
5. **Auto-Ship**: When you output `<promise>READY TO SHIP</promise>`, the hook automatically triggers /ship

## Refactor Workflow

1. **Understand**: Read and understand the current code structure
2. **Plan**: Identify what needs to change and in what order
3. **Incremental Changes**: Make small, testable changes
4. **Verify**: Run tests after each change to ensure behavior is preserved
5. **Apply Patterns**: Apply Effect patterns where applicable

## Refactor Checklist

Before completing, ensure:
- [ ] Behavior is preserved (all tests pass)
- [ ] Code follows Effect patterns:
  - `Data.TaggedError` for errors
  - `Effect.gen(function* () { ... })` for use cases
  - Typed error channels
- [ ] All tests passing: `pnpm test`
- [ ] Typecheck passing: `pnpm typecheck`
- [ ] No functional changes unless explicitly requested
- [ ] Tech debt checked and fixed (see below)

## Tech Debt Check

Before shipping, run tech-debt analysis on the packages you modified:

1. **Identify changed packages**: Check `git status` to see which `packages/*` directories have changes
2. **Run targeted analysis**: For each modified package, run `/tech-debt @repo/package-name`
3. **Fix issues**: Address any critical issues or recommendations with scores below 4/5
4. **Re-verify**: Ensure tests and typecheck still pass after fixes

Example: If you modified `packages/competition/`, run `/tech-debt @repo/competition`.

## Completion

Only output `<promise>READY TO SHIP</promise>` when ALL of the above are true.

After completion, /ship will:
1. Create a refactor branch
2. Commit your changes
3. Push to remote
4. Create a pull request
5. Run code review
