#!/bin/bash
# PostToolUse hook: auto-format files after Edit/Write
file=$(cat | jq -r '.tool_input.file_path // ""')
[ -n "$file" ] && [ -f "$file" ] && prettier --write "$file" --ignore-path .prettierignore 2>/dev/null || true
