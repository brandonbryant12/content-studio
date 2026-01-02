#!/bin/bash

while true; do
    cat PROMPT.md | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --verbose \
        | bunx repomirror visualize

    # Check if IMPLEMENTATION_PLAN.md is marked as COMPLETE
    if grep -q "STATUS: ✅ COMPLETE" IMPLEMENTATION_PLAN.md 2>/dev/null; then
        echo -e "\n\n========================IMPLEMENTATION COMPLETE=========================\n\n"
        break
    fi

    pnpm typecheck && pnpm test && pnpm build
    git push origin main
    echo -e "\n\n========================LOOP=========================\n\n"
done
