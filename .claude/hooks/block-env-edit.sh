#!/bin/bash
# PreToolUse hook: block edits to .env files
file=$(cat | jq -r '.tool_input.file_path // ""')
if [[ "$file" == *.env* ]]; then
  echo '{"decision":"block","reason":"Cannot modify .env files — edit these manually"}'
fi
