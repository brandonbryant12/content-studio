#!/bin/bash
set -euo pipefail

# Ralph Wiggum Stop Hook - Inlined for card-madness project
# Intercepts exit attempts and feeds the same prompt back for iterative development

HOOK_INPUT=$(cat)
STATE_FILE=".claude/ralph-loop.local.md"

# No active loop - allow normal exit
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Parse YAML frontmatter (between --- markers)
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//')
MAX_ITERATIONS=$(echo "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//')
COMPLETION_PROMISE=$(echo "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')
TASK_TYPE=$(echo "$FRONTMATTER" | grep '^task_type:' | sed 's/task_type: *//' || echo "task")

# Validate state file - stop loop if corrupted
if [[ ! "$ITERATION" =~ ^[0-9]+$ ]] || [[ ! "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
  echo "Loop state corrupted, cleaning up" >&2
  rm "$STATE_FILE"
  exit 0
fi

# Max iterations reached - stop loop
if [[ $MAX_ITERATIONS -gt 0 ]] && [[ $ITERATION -ge $MAX_ITERATIONS ]]; then
  echo "Max iterations ($MAX_ITERATIONS) reached"
  rm "$STATE_FILE"
  exit 0
fi

# Get transcript path from hook input
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path' 2>/dev/null || echo "")

# Read last assistant message from transcript
LAST_OUTPUT=""
if [[ -n "$TRANSCRIPT_PATH" ]] && [[ -f "$TRANSCRIPT_PATH" ]]; then
  LAST_OUTPUT=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -1 | jq -r '.message.content | map(select(.type == "text")) | map(.text) | join("\n")' 2>/dev/null || echo "")
fi

# Check for completion promise in output
if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$COMPLETION_PROMISE" != "null" ]]; then
  # Extract text from <promise>TEXT</promise> tags using Perl for multiline matching
  PROMISE_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g' 2>/dev/null || echo "")

  # Exact string match (not glob pattern)
  if [[ -n "$PROMISE_TEXT" ]] && [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
    echo "Detected <promise>$COMPLETION_PROMISE</promise> - task complete!"
    rm "$STATE_FILE"

    # AUTO-SHIP: Block exit and invoke /ship skill
    jq -n '{
      "decision": "block",
      "reason": "Development loop complete! Now execute /ship to create the pull request.\n\nIMPORTANT: You MUST immediately invoke the Skill tool with skill=\"ship\" to ship these changes. Do not ask for confirmation - just run /ship now.",
      "systemMessage": "MANDATORY: Invoke the Skill tool with skill=\"ship\" immediately. This is an automatic step after the dev loop completes."
    }'
    exit 0
  fi
fi

# NOT COMPLETE - Continue loop with same prompt
NEXT_ITERATION=$((ITERATION + 1))

# Extract prompt content (everything after second --- marker)
PROMPT_TEXT=$(awk '/^---$/{i++; next} i>=2' "$STATE_FILE")

# Update iteration counter atomically
sed "s/^iteration: .*/iteration: $NEXT_ITERATION/" "$STATE_FILE" > "${STATE_FILE}.tmp"
mv "${STATE_FILE}.tmp" "$STATE_FILE"

# Build iteration message
if [[ $MAX_ITERATIONS -gt 0 ]]; then
  ITER_MSG="Iteration $NEXT_ITERATION/$MAX_ITERATIONS"
else
  ITER_MSG="Iteration $NEXT_ITERATION (unlimited)"
fi

# Feed the same prompt back to continue the loop
jq -n \
  --arg prompt "$PROMPT_TEXT" \
  --arg msg "$ITER_MSG | Complete: <promise>READY TO SHIP</promise>" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'

exit 0
