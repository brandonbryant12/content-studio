#!/bin/bash
set -euo pipefail

# Setup script for development loops (/feature, /bugfix, /refactor)
# Creates the state file that the stop hook monitors
#
# Options:
#   --plan, -p    Ask clarifying questions before starting implementation
#   --think, -t   Enable extended thinking (ultrathink) mode
#   --max N       Set max iterations (default: 30)

usage() {
  echo "Usage: setup-dev-loop.sh <task-type> [options] <description...>"
  echo ""
  echo "Task types: feature, bugfix, refactor"
  echo ""
  echo "Options:"
  echo "  --plan, -p     Ask clarifying questions before implementation"
  echo "  --think, -t    Enable extended thinking (ultrathink) mode"
  echo "  --max N        Set max iterations (default: 30)"
  echo ""
  echo "Examples:"
  echo "  setup-dev-loop.sh feature Add user notifications"
  echo "  setup-dev-loop.sh feature --plan Add user notifications"
  echo "  setup-dev-loop.sh feature --think --plan Add complex feature"
  echo "  setup-dev-loop.sh bugfix -pt Fix race condition"
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

TASK_TYPE="$1"
shift

# Validate task type
case "$TASK_TYPE" in
  feature|bugfix|refactor) ;;
  *)
    echo "Error: Invalid task type '$TASK_TYPE'. Must be: feature, bugfix, or refactor"
    exit 1
    ;;
esac

# Parse options
ENABLE_PLAN=false
ENABLE_THINK=false
MAX_ITERATIONS=30
DESCRIPTION_PARTS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --plan|-p)
      ENABLE_PLAN=true
      shift
      ;;
    --think|-t)
      ENABLE_THINK=true
      shift
      ;;
    -pt|-tp)
      ENABLE_PLAN=true
      ENABLE_THINK=true
      shift
      ;;
    --max)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    *)
      DESCRIPTION_PARTS+=("$1")
      shift
      ;;
  esac
done

DESCRIPTION="${DESCRIPTION_PARTS[*]}"

if [[ -z "$DESCRIPTION" ]]; then
  echo "Error: No description provided"
  usage
fi

COMPLETION_PROMISE="READY TO SHIP"

# Build mode indicators
MODES=""
if [[ "$ENABLE_PLAN" == "true" ]]; then
  MODES="${MODES}planning "
fi
if [[ "$ENABLE_THINK" == "true" ]]; then
  MODES="${MODES}ultrathink "
fi
if [[ -z "$MODES" ]]; then
  MODES="standard"
fi

# Ensure .claude directory exists
mkdir -p .claude

# Build the planning section if enabled
PLANNING_SECTION=""
if [[ "$ENABLE_PLAN" == "true" ]]; then
  PLANNING_SECTION="
## Phase 1: Planning (REQUIRED FIRST)

Before writing ANY code, you MUST complete these steps:

### Step 1: Explore with Sub-agents (preserves your context)

Spawn Explore agents to understand the codebase. This keeps exploration
out of your main context. Use the Task tool with subagent_type='Explore':

\`\`\`
Task(subagent_type='Explore', prompt='Find where X is implemented and what patterns are used')
Task(subagent_type='Explore', prompt='Find existing tests for similar features')
\`\`\`

Launch multiple Explore agents in parallel for efficiency.

### Step 2: Design with Plan Agent (optional for complex tasks)

For complex implementations, spawn a Plan agent:

\`\`\`
Task(subagent_type='Plan', prompt='Design implementation plan for: <task description>')
\`\`\`

### Step 3: Ask Clarifying Questions

Use AskUserQuestion tool to:
- Confirm your understanding of requirements
- Clarify any ambiguous aspects
- Get approval on your proposed approach

### Step 4: Summarize Plan

Write a brief plan covering:
- Files to create/modify
- Key implementation decisions
- Testing approach

Only proceed to implementation after the user confirms.

"
fi

# Build the thinking section if enabled
THINKING_SECTION=""
if [[ "$ENABLE_THINK" == "true" ]]; then
  THINKING_SECTION="
## Extended Thinking Mode

Use deep, thorough analysis for this task:
- Consider multiple approaches before choosing
- Think through edge cases carefully
- Reason about error handling comprehensively
- Consider performance and maintainability implications

ultrathink

"
fi

# Create state file with YAML frontmatter + prompt content
cat > .claude/ralph-loop.local.md <<EOF
---
active: true
task_type: $TASK_TYPE
iteration: 1
max_iterations: $MAX_ITERATIONS
completion_promise: "$COMPLETION_PROMISE"
enable_plan: $ENABLE_PLAN
enable_think: $ENABLE_THINK
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
---

# $(echo "$TASK_TYPE" | awk '{print toupper(substr($0,1,1)) substr($0,2)}') Development: $DESCRIPTION
$PLANNING_SECTION$THINKING_SECTION
## Effect Pattern Requirements (see standards/patterns/)
- Use Data.TaggedError for domain errors with factory functions
- Use Effect.gen(function* () { ... }) for use cases
- Write tests with @effect/vitest and it.effect()
- No \`any\` types or unsafe casts
- Repos return Effect<T, DbError, typeof Db.Identifier>

## Iteration Workflow
1. Check git status to see progress from previous iterations
2. Implement/fix in small, testable increments
3. Run tests: \`pnpm test\`
4. Run typecheck: \`pnpm typecheck\`
5. Run pattern validation: \`.claude/scripts/validate-patterns.sh\`
6. Fix any failures found
7. When ALL checks pass and task is complete:
   Output: <promise>READY TO SHIP</promise>

## Context Preservation Tips
- Use Task(subagent_type='Explore') for searching the codebase
- Sub-agents preserve your main context for editing and iteration
- Only read files directly when you need to edit them

## Task Description
$DESCRIPTION

## CRITICAL RULES
Only output <promise>READY TO SHIP</promise> when:
- All tests are passing
- Typecheck passes
- Pattern validation passes (\`.claude/scripts/validate-patterns.sh\`)
- The task is fully complete
- Code follows Effect patterns

Do NOT output the completion promise if:
- Tests are failing
- Typecheck has errors
- Implementation is partial
- You encountered unresolved blockers
EOF

# Output activation message
echo ""
echo "========================================"
echo "  $(echo "$TASK_TYPE" | tr '[:lower:]' '[:upper:]') LOOP ACTIVATED"
echo "========================================"
echo ""
echo "Task: $DESCRIPTION"
echo "Mode: $MODES"
echo "Max iterations: $MAX_ITERATIONS"
echo "Completion: <promise>READY TO SHIP</promise>"
echo ""
if [[ "$ENABLE_PLAN" == "true" ]]; then
  echo "Planning mode: ON - Will ask clarifying questions first"
fi
if [[ "$ENABLE_THINK" == "true" ]]; then
  echo "Ultrathink mode: ON - Extended reasoning enabled"
fi
echo ""
echo "The stop hook will:"
echo "  1. Feed the same prompt back after each iteration"
echo "  2. Auto-run /ship when you complete"
echo ""
echo "To cancel: /cancel-loop"
echo ""
echo "========================================"
echo ""

# Display the task prompt
tail -n +12 .claude/ralph-loop.local.md
