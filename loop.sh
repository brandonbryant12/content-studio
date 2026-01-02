#!/bin/bash

while true; do
    cat PROMPT.md | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --verbose \
        | bunx repomirror visualize
    pnpm typecheck && pnpm test && pnpm build
    git push origin main
    echo -e "\n\n========================LOOP=========================\n\n"
done
