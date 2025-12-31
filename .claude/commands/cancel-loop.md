---
description: Cancel active development loop
allowed-tools: Bash
---

# Cancel Development Loop

This cancels any active `/feature`, `/bugfix`, or `/refactor` loop.

```bash
if [[ -f .claude/ralph-loop.local.md ]]; then
  # Extract current state
  ITERATION=$(grep '^iteration:' .claude/ralph-loop.local.md | sed 's/iteration: *//')
  TASK_TYPE=$(grep '^task_type:' .claude/ralph-loop.local.md | sed 's/task_type: *//' || echo "unknown")

  # Remove state file
  rm .claude/ralph-loop.local.md

  echo ""
  echo "========================================"
  echo "  LOOP CANCELLED"
  echo "========================================"
  echo ""
  echo "Task type: $TASK_TYPE"
  echo "Stopped at iteration: $ITERATION"
  echo ""
  echo "Your work is preserved in the filesystem."
  echo "You can:"
  echo "  - Review changes with: git status && git diff"
  echo "  - Commit manually with: git add . && git commit"
  echo "  - Start a new loop with: /feature, /bugfix, or /refactor"
  echo ""
else
  echo "No active development loop found."
  echo ""
  echo "To start a loop, use:"
  echo "  /feature <description>"
  echo "  /bugfix <description>"
  echo "  /refactor <description>"
fi
```
