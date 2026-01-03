#!/bin/bash

# Usage: ./loop.sh plans/my-feature.md
# If no argument provided, defaults to IMPLEMENTATION_PLAN.md for backwards compatibility

PLAN_PATH="${1:-IMPLEMENTATION_PLAN.md}"

if [ ! -f "$PLAN_PATH" ]; then
    echo "Error: Plan file not found: $PLAN_PATH"
    exit 1
fi

echo "Using plan: $PLAN_PATH"

while true; do
    # Prepend the plan path to the prompt
    (echo "## Active Plan: $PLAN_PATH"; echo ""; cat PROMPT.md) | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --verbose \
        | bunx repomirror visualize

    # Check if plan is marked as COMPLETE
    if grep -q "STATUS: ✅ COMPLETE" "$PLAN_PATH" 2>/dev/null; then
        echo -e "\n\n========================IMPLEMENTATION COMPLETE=========================\n\n"
        break
    fi

    pnpm typecheck && pnpm test && pnpm build
    git push origin main
    echo -e "\n\n========================LOOP=========================\n\n"
done
