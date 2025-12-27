# Continuous Claude Agent

An orchestration system for running Claude Code continuously toward a goal, with memory persistence across sessions.

## Features

- **Goal-oriented execution** - Define a goal and let Claude work toward it
- **Memory persistence** - SQLite stores actions, checkpoints, and learnings
- **Automatic checkpointing** - Claude saves progress periodically
- **Learning extraction** - Important discoveries are captured and reused
- **Resume capability** - Stop and restart without losing progress

## Quick Start

```bash
# Install dependencies
pnpm install

# Start a new goal
pnpm start "Add dark mode support to the app"

# Check progress (in another terminal)
pnpm status

# Resume after stopping
pnpm start  # Continues last active goal

# Reset and start fresh
pnpm reset
pnpm start "New goal here"
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm start "goal"` | Start a new goal |
| `pnpm start` | Resume active goal |
| `pnpm start --max-cycles 50` | Limit iterations |
| `pnpm status` | Show current progress |
| `pnpm status --full` | Show complete history |
| `pnpm status --learnings` | Show only learnings |
| `pnpm reset` | Clear memory and start fresh |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CYCLES` | 100 | Maximum iterations before stopping |
| `CYCLE_PAUSE_MS` | 5000 | Pause between cycles (ms) |
| `MAX_CYCLE_TIME_MS` | 600000 | Timeout per cycle (10 min) |
| `WORKSPACE_DIR` | /workspace | Working directory for Claude |

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  Memory  │◄──►│  Claude  │◄──►│  Codebase │          │
│  │ (SQLite) │    │   Code   │    │           │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│       │                │                                 │
│       ▼                ▼                                 │
│  ┌──────────────────────────────────────────┐          │
│  │ Checkpoints, Learnings, Action History    │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

1. **Orchestrator** builds a prompt with goal + context from memory
2. **Claude Code** runs with the prompt, making code changes
3. **Claude** outputs checkpoints and learnings in structured format
4. **Orchestrator** parses output, updates memory, loops

## Checkpoint Format

Claude outputs checkpoints in this format:

```
=== CHECKPOINT ===
Progress: 45%
Summary: Implemented dark mode toggle component
Next: Add theme context provider and wire up to settings
=== END CHECKPOINT ===
```

## Learning Format

Claude records learnings like:

```
=== LEARNING ===
Category: architecture
Content: Theme colors are defined in tailwind.config.ts, not CSS variables
=== END LEARNING ===
```

## Files

| File | Purpose |
|------|---------|
| `orchestrator.ts` | Main loop that runs Claude |
| `memory.ts` | SQLite memory management |
| `status.ts` | Progress viewer |
| `prompt-template.md` | Master prompt sent to Claude |
| `agent.db` | SQLite database (created at runtime) |
| `current-prompt.md` | Last prompt sent (for debugging) |

## Safety Notes

This is designed to run inside the dev container with:
- Firewall restricting network access
- Isolated filesystem
- No access to host credentials

**Do not run this on your host machine with `--dangerously-skip-permissions`**

## Example Goals

```bash
# Feature development
pnpm start "Implement user authentication with email/password"

# Bug fixing
pnpm start "Fix all TypeScript errors in the packages/api directory"

# Testing
pnpm start "Write unit tests for the user service with 80% coverage"

# Refactoring
pnpm start "Migrate all class components to functional components with hooks"

# Documentation
pnpm start "Add JSDoc comments to all exported functions in packages/core"
```
